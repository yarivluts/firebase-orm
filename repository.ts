import * as firebase from "firebase/app";
import 'firebase/firestore';
import { collection, addDoc, doc, Firestore, getDoc, updateDoc, setDoc, DocumentReference, DocumentData, CollectionReference, FieldPath, query, documentId, where, getDocs } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { BaseModel } from "./base.model";
import { ModelInterface } from "./interfaces/model.interface";
import { FireSQL } from "firesql";
import { ElasticSqlResponse } from "./interfaces/elastic.sql.response.interface";
import * as axios_ from 'axios';
import * as qs from 'qs';

const axios = axios_.default;

export class FirestoreOrmRepository {

    static globalFirestores = {};
    static globalWait = {};
    static globalPaths = {};
    static documentsRequiredFields = {};
    static DEFAULT_KEY_NAME = 'default';
    static ormFieldsStructure = {};
    static elasticSearchConnections = {};
    static globalFirebaseStoages = {};

    constructor(protected firestore: Firestore) {

    }

    static initGlobalConnection(firestore: Firestore, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.globalFirestores[key] = new FirestoreOrmRepository(firestore);
        if (this.globalWait[key]) {
            this.globalWait[key](this.globalFirestores[key]);
        }
    }

    static initGlobalStorage(storage: FirebaseStorage, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.globalFirebaseStoages[key] = storage;
    }

    static initGlobalElasticsearchConnection(url: string, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.elasticSearchConnections[key] = {
            url: url
        };
    }

    static getGlobalStorage(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): FirebaseStorage {
        if (this.globalFirebaseStoages[key]) {
            return this.globalFirebaseStoages[key];
        } else {
            throw "the global firebase storage  " + key + ' is undefined!';
        }
    }

    static getGlobalElasticsearchConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        if (this.elasticSearchConnections[key]) {
            return this.elasticSearchConnections[key];
        } else {
            throw "the global elasticsearch  " + key + ' is undefined!';
        }
    }


    static getGlobalConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        if (this.globalFirestores[key]) {
            return this.globalFirestores[key];
        } else {
            throw "the global firestore " + key + ' is undefined!';
        }
    }

    static waitForGlobalConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        if (this.globalWait[key]) {
            return this.globalWait[key];
        }
        return new Promise((resolve) => {
            if (this.globalFirestores[key]) {
                resolve(this.globalFirestores[key]);
            }
            this.globalWait[key] = resolve;
        });
    }


    static initGlobalPath(pathIdKey: string, pathIdValue: string) {
        this.globalPaths[pathIdKey] = pathIdValue;
    }

    static getGlobalPath(pathIdKey: string) {
        if (this.globalPaths[pathIdKey] && this.globalPaths[pathIdKey].trim() !== '') {
            return this.globalPaths[pathIdKey];
        } else {
            return null;
        }
    }

    getCollectionReferenceByModel(object: any, isDoc: boolean = false, customId?: string): DocumentReference<DocumentData> | CollectionReference<DocumentData> | null {
        var current: any = this.firestore;
        var pathList: any = object.getPathList();
        const id = customId ?? object.getId();
        if (!pathList || pathList.length < 1) {
            console.error("Can't get collection path - ", object);
            return null;
        }
        for (var i = 0; i < pathList.length; i++) {
            var stage = pathList[i];
            if (!stage.value) {
                continue;
            }
            if (stage.type == 'collection') {

                // console.log('current', current);
                current = collection(current, stage.value);
                if ((isDoc && i + 1 == pathList.length)) {
                    const id = customId ?? object.id ?? null;
                    if (id) {
                        current = doc(current, id);
                    } else {
                        current = doc(current);
                    }
                    //  console.log('isDoc', isDoc, 'id', id, 'current', current)

                }
            } else if (stage.type == 'document') {
                current = doc(current, stage.value);
            }
        }
        return current;
    }

    getDocReferenceByModel(object: any, customId?: string): DocumentReference<DocumentData> | null {
        return this.getCollectionReferenceByModel(object, true, customId) as DocumentReference<DocumentData> | null;
    }

    getFirestore(): Firestore {
        return this.firestore;
    }

    getModel<T>(model: { new(): T; }): T & BaseModel {
        var m: any | T = model;
        var object: any = new m();
        object.setRepository(this);
        object.setModelType(model);
        object.currentModel = object;
        //object.initFields();

        return <T & BaseModel>object;
    }

    async sql(sql: string): Promise<Array<Object>> {
        const fireSQL = new FireSQL(this.firestore as any);
        try {
            return await fireSQL.query(sql, { includeId: 'id' });
        } catch (error) {
            console.error('SQL GENERAL ERROR - ', error);
            return [];
        }
    }

    /**
     * Listen to sql query result 
     * @param sql - sql query 
     * @param callback - running callback
     */
    onSql(sql: string, callback: CallableFunction): void {
        const fireSQL: any = new FireSQL(this.firestore as any);
        try {
            const res = fireSQL.rxQuery(sql, { includeId: 'id' });
            res.subscribe((results: any) => {
                callback(results);
            })
        } catch (error) {
            console.error('SQL GENERAL ERROR - ', error);
        }
    }

    /**
     * Load model object by id
     * @param object - class
     * @param id -string id
     * @param params - path params
     * @return model object
     */
    async load(object: any, id: string, params: { [key: string]: string; } = {}): Promise<ModelInterface> {
        for (let key in params) {
            let value = params[key];
            object[key] = value;
        }
        var ref = this.getCollectionReferenceByModel(object) as CollectionReference<DocumentData>;
        if (!ref) {
            console.error("Can't load the model " + object.getReferencePath() + " , please set all values");
            return object;
        } else {
            if (!id) {
                console.error("Can't load the model " + object.getReferencePath() + " , please set id");
            } else {
                const docsRef = await getDocs(query(ref, where(documentId(), '==', id)));

                /*   const docRef = doc(ref, id)
                  var docObj = await getDoc(docRef); */
                if (docsRef.size == 0) {
                    object.is_exist = false;
                    return object;
                } else {
                    const docObj = docsRef.docs[0];
                    object.is_exist = true;
                    object.initFromData(docObj.data());
                    return object;
                }
            }
        }

        return object;
    }

    /**
     * Save the model object
     * @param model 
     */
    async save(model: any, customId?: string) {
        var object: ModelInterface = model;
        var ref = this.getDocReferenceByModel(object, object.getId() ?? customId);
        if (!ref) {
            console.error("Can't save the model " + object.getReferencePath() + " , please set all values");
            return false;
        }

        if (object.getId()) {
            updateDoc(ref, object.getDocumentData() as any)
            /*  var docRef = ref.doc
                 ? await ref.doc(object.getId()).set(object.getDocumentData())
                 : await ref.set(object.getDocumentData()); */
        } else {
            try {
                setDoc(ref, object.getDocumentData() as any);
                /* var docRef = await ref.add(object.getDocumentData()); */
                object.setId(ref.id);
            } catch (error) {
                console.error("Error adding document: ", error);
            }

        }
        return object;
    }



    static async elasticSql<T>(this: { new(): T },
        sql?: string,
        limit?: number,
        filters?: any,
        cursor?: any,
        columns?: any
    ): Promise<ElasticSqlResponse> {
        var object: any = new this();
        object.setModelType(this);
        var result: any = {
            data: []
        };

        try {
            var connection = FirestoreOrmRepository.getGlobalElasticsearchConnection();
        } catch (error) {
            console.error(error);
            return result;
        }

        if (!connection || !connection.url) {
            console.error('Elasticsearch is not defined!');
            return result;
        }
        var params: any = {};

        if (sql) {
            params['query'] = sql;
        }
        if (limit) {
            params['fetch_size'] = limit;
        }
        if (filters) {
            params['filter'] = filters;
        }
        if (cursor) {
            params['cursor'] = cursor;
        }

        try {
            var response = await axios({
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                data: qs.stringify(params),
                url: connection.url + '/_sql'
            });
            var data = response.data;
            columns = columns ? columns : response.data.columns;
            var rows = response.data.rows;
            rows.forEach((row: any) => {
                var newObject: any = {};
                columns.forEach((column: any, index: any) => {
                    newObject[column.name] = row[index];
                });
                result.data.push(newObject);
            });
            //printLog(response.data);
            //printLog(params);

            // return result;
            if (response.data.cursor) {
                result.next = async () => {

                    return await (this as any).elasticSql(null, null, null, response.data.cursor, columns);
                }
            }

        } catch (error) {
            console.error(error);
        }

        //printLog(resultObject);
        return result;
    }

} 