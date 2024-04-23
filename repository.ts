import type {
    collection as collectionFuncType,
    doc as docFuncType,
    Firestore,
    updateDoc as updateDocFuncType,
    setDoc as setDocFuncType,
    DocumentReference,
    DocumentData,
    CollectionReference,
    query as queryFuncType,
    documentId as documentIdFuncType,
    where as whereFuncType,
    getDocs as getDocsFuncType
} from "firebase/firestore";

let collection: typeof collectionFuncType;
let doc: typeof docFuncType;
let updateDoc: typeof updateDocFuncType;
let setDoc: typeof setDocFuncType;
let query: typeof queryFuncType;
let documentId: typeof documentIdFuncType;
let where: typeof whereFuncType;
let getDocs: typeof getDocsFuncType;

import type { FirebaseOptions } from "firebase/app";
import type { FirebaseStorage } from "firebase/storage";
import { BaseModel } from "./base.model";
import { ModelInterface } from "./interfaces/model.interface";
import { ElasticSqlResponse } from "./interfaces/elastic.sql.response.interface";
import * as qs from 'qs';

let axios: any;

/**
 * Represents a repository for Firestore ORM.
 */
export class FirestoreOrmRepository {

    static globalFirestores = {};
    static globalWait = {};
    static globalPaths = {};
    static documentsRequiredFields = {};
    static DEFAULT_KEY_NAME = 'default';
    static ormFieldsStructure = {};
    static elasticSearchConnections = {};
    static globalFirebaseStoages = {};
    static isReady = false;

    constructor(protected firestore: Firestore) {
        import("firebase/firestore").then((module) => {
            collection = module.collection;
            doc = module.doc;
            updateDoc = module.updateDoc;
            setDoc = module.setDoc;
            query = module.query;
            documentId = module.documentId;
            where = module.where;
            getDocs = module.getDocs;
            FirestoreOrmRepository.isReady = true;
        });
        import('axios').then((module) => {
            axios = module.default;
        });
    }

    /**
     * Initializes a global connection for Firestore ORM.
     * @param firestore - The Firestore instance.
     * @param key - The key to identify the global connection (optional).
     */
    static initGlobalConnection(firestore: Firestore, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.globalFirestores[key] = new FirestoreOrmRepository(firestore);
        if (this.globalWait[key]) {
            this.globalWait[key](this.globalFirestores[key]);
        }
    }

    /**
     * Initializes the Firebase app and sets up a global connection for Firestore ORM.
     * @param options - The Firebase app options.
     * @param name - The name of the Firebase app (optional).
     * @returns The initialized Firebase app.
     */
    static async initializeApp(options: FirebaseOptions, name?: string | undefined) {
        const app = await import('firebase/app');
        const firebaseApp = app.initializeApp(options, name);
        const { getFirestore } = await import('firebase/firestore');
        const connection = getFirestore(firebaseApp);
        this.initGlobalConnection(connection);
        return firebaseApp;
    }

    /**
     * Initializes a global storage for Firestore ORM.
     * @param storage - The Firebase storage instance.
     * @param key - The key to identify the global storage (optional).
     */
    static initGlobalStorage(storage: FirebaseStorage, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.globalFirebaseStoages[key] = storage;
    }

    /**
     * Initializes a global Elasticsearch connection for Firestore ORM.
     * @param url - The Elasticsearch URL.
     * @param key - The key to identify the global Elasticsearch connection (optional).
     */
    static initGlobalElasticsearchConnection(url: string, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        this.elasticSearchConnections[key] = {
            url: url
        };
    }

    /**
     * Retrieves the global Firebase storage instance.
     * @param key - The key to identify the global storage (optional).
     * @returns The global Firebase storage instance.
     * @throws An error if the global Firebase storage is undefined.
     */
    static getGlobalStorage(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): FirebaseStorage {
        if (this.globalFirebaseStoages[key]) {
            return this.globalFirebaseStoages[key];
        } else {
            throw new Error("The global Firebase storage " + key + " is undefined!");
        }
    }

    /**
     * Retrieves the global Elasticsearch connection.
     * @param key - The key to identify the global Elasticsearch connection (optional).
     * @returns The global Elasticsearch connection.
     * @throws An error if the global Elasticsearch connection is undefined.
     */
    static getGlobalElasticsearchConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        if (this.elasticSearchConnections[key]) {
            return this.elasticSearchConnections[key];
        } else {
            throw new Error("The global Elasticsearch " + key + " is undefined!");
        }
    }

    /**
     * Retrieves the global Firestore connection.
     * @param key - The key to identify the global Firestore connection (optional).
     * @returns The global Firestore connection.
     * @throws An error if the global Firestore connection is undefined.
     */
    static getGlobalConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): FirestoreOrmRepository {
        if (this.globalFirestores[key]) {
            return this.globalFirestores[key];
        } else {
            throw new Error("The global Firestore " + key + " is undefined!");
        }
    }

    /**
     * Waits for the global Firestore connection to be ready.
     * @param key - The key to identify the global Firestore connection (optional).
     * @returns A promise that resolves to the global Firestore connection.
     */
    static waitForGlobalConnection(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): Promise<FirestoreOrmRepository> {
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

    /**
     * Initializes a global path for Firestore ORM.
     * @param pathIdKey - The key to identify the global path.
     * @param pathIdValue - The value of the global path.
     */
    static initGlobalPath(pathIdKey: string, pathIdValue: string) {
        this.globalPaths[pathIdKey] = pathIdValue;
    }

    /**
     * Retrieves the global path by its key.
     * @param pathIdKey - The key of the global path.
     * @returns The value of the global path, or null if it is not defined.
     */
    static getGlobalPath(pathIdKey: string) {
        if (this.globalPaths[pathIdKey] && this.globalPaths[pathIdKey].trim() !== '') {
            return this.globalPaths[pathIdKey];
        } else {
            return null;
        }
    }

    /**
     * Retrieves the collection or document reference based on the model object.
     * @param object - The model object.
     * @param isDoc - Indicates whether the reference should be a document reference (optional, default: false).
     * @param customId - The custom ID for the document reference (optional).
     * @returns The collection or document reference, or null if the path cannot be determined.
     */
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
                current = collection(current, stage.value);
                if ((isDoc && i + 1 == pathList.length)) {
                    const id = customId ?? object.id ?? null;
                    if (id) {
                        current = doc(current, id);
                    } else {
                        current = doc(current);
                    }
                }
            } else if (stage.type == 'document') {
                current = doc(current, stage.value);
            }
        }
        return current;
    }

    /**
     * Retrieves the document reference based on the model object.
     * @param object - The model object.
     * @param customId - The custom ID for the document reference (optional).
     * @returns The document reference, or null if the path cannot be determined.
     */
    getDocReferenceByModel(object: any, customId?: string): DocumentReference<DocumentData> | null {
        return this.getCollectionReferenceByModel(object, true, customId) as DocumentReference<DocumentData> | null;
    }

    /**
     * Retrieves the Firestore instance.
     * @returns The Firestore instance.
     */
    getFirestore(): Firestore {
        return this.firestore;
    }

    /**
     * Retrieves the model object based on the model class.
     * @param model - The model class.
     * @returns The model object.
     */
    getModel<T>(model: { new(): T; }): T & BaseModel {
        var m: any | T = model;
        var object: any = new m();
        object.setRepository(this);
        object.setModelType(model);
        object.currentModel = object;
        return <T & BaseModel>object;
    }

    /**
     * Loads a model object by its ID.
     * @param object - The model class.
     * @param id - The ID of the model object.
     * @param params - The path parameters (optional).
     * @returns A promise that resolves to the model object.
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
     * Saves the model object.
     * @param model - The model object.
     * @param customId - The custom ID for the document reference (optional).
     * @returns A promise that resolves to the saved model object.
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
        } else {
            try {
                setDoc(ref, object.getDocumentData() as any);
                object.setId(ref.id);
            } catch (error) {
                console.error("Error adding document: ", error);
            }
        }
        return object;
    }

    /**
     * Executes an Elasticsearch SQL query.
     * @param this - The model class.
     * @param sql - The SQL query (optional).
     * @param limit - The maximum number of results to retrieve (optional).
     * @param filters - The filters to apply to the query (optional).
     * @param cursor - The cursor for pagination (optional).
     * @param columns - The columns to retrieve (optional).
     * @returns A promise that resolves to the Elasticsearch SQL response.
     */
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