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

// Support for Admin SDK types
import type { App as AdminApp } from 'firebase-admin/app';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';
import type { Storage as AdminStorage } from 'firebase-admin/storage';

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
    static readyPromises: { [key: string]: Promise<FirestoreOrmRepository> } = {};

    private setupPromise: Promise<void>;

    /**
     * Determines if the provided Firestore instance is from Admin SDK
     * @param firestore - The Firestore instance to check
     * @returns true if it's Admin SDK, false if it's Client SDK
     */
    private isAdminFirestore(firestore: any): boolean {
        // Handle null/undefined values gracefully
        if (!firestore) {
            return false;
        }
        
        // Admin SDK Firestore has instance methods and specific properties
        return typeof firestore.collection === 'function' && 
               typeof firestore.doc === 'function' &&
               (firestore._settings !== undefined || firestore.toJSON !== undefined);
    }

    constructor(protected firestore: Firestore | AdminFirestore) {
        // Detect if we're using Admin SDK or Client SDK
        const isAdminSDK = this.isAdminFirestore(firestore);
        
        if (isAdminSDK) {
            // For Admin SDK, create comprehensive wrapper functions
            console.log("Admin SDK detected - setting up compatibility functions");
            this.setupAdminSDKCompatibility();
            FirestoreOrmRepository.isReady = true;
            this.setupPromise = Promise.resolve();
        } else {
            // For Client SDK, import the functions from firebase/firestore
            this.setupPromise = this.setupClientSDKCompatibility();
        }
        
        import('axios').then((module) => {
            axios = module.default;
        });
    }

    private setupAdminSDKCompatibility(): void {
        const firestore = this.firestore as any;

        collection = ((parent: any, collectionId: string) => {
            if (parent === this.firestore) {
                return firestore.collection(collectionId);
            }
            // Check if parent has a collection method
            if (parent && typeof parent.collection === 'function') {
                return parent.collection(collectionId);
            }
            // If parent doesn't have collection method, check if it's a document path and construct manually
            if (parent && parent.path) {
                // For Admin SDK, we can construct the path manually
                return firestore.collection(`${parent.path}/${collectionId}`);
            }
            // Final fallback - this should not happen in normal Admin SDK usage
            throw new Error(`Cannot access collection '${collectionId}' from parent object. Parent does not have a collection method and no path property found.`);
        }) as any;
        
        doc = ((parent: any, docId?: string) => {
            if (arguments.length === 1) {
                return parent.doc();
            }
            if (parent === this.firestore) {
                return firestore.doc(docId);
            }
            return parent.doc(docId);
        }) as any;
        
        updateDoc = ((docRef: any, data: any) => docRef.update(data)) as any;
        setDoc = ((docRef: any, data: any, options?: any) => {
            return options ? docRef.set(data, options) : docRef.set(data);
        }) as any;
        
        query = ((ref: any, ...constraints: any[]) => {
            let result = ref;
            for (const constraint of constraints) {
                if (constraint && typeof constraint.apply === 'function') {
                    result = constraint.apply(result);
                }
            }
            return result;
        }) as any;
        
        documentId = (() => '__name__') as any;
        where = ((field: string, op: string, value: any) => ({
            apply: (ref: any) => ref.where(field, op, value)
        })) as any;
        getDocs = ((ref: any) => ref.get()) as any;
    }

    private async setupClientSDKCompatibility(): Promise<void> {
        try {
            const module = await import("firebase/firestore");
            collection = module.collection;
            doc = module.doc;
            updateDoc = module.updateDoc;
            setDoc = module.setDoc;
            query = module.query;
            documentId = module.documentId;
            where = module.where;
            getDocs = module.getDocs;
            FirestoreOrmRepository.isReady = true;
        } catch (error) {
            // If Firebase client SDK fails, try Admin SDK setup as fallback
            console.log("Client SDK import failed, checking if Admin SDK is available...");
            if (this.isAdminFirestore(this.firestore)) {
                console.log("Falling back to Admin SDK compatibility mode");
                this.setupAdminSDKCompatibility();
                FirestoreOrmRepository.isReady = true;
            } else {
                console.error("Failed to load Firebase modules and no Admin SDK detected");
                throw error;
            }
        }
    }

    /**
     * Initializes a global connection for Firestore ORM.
     * @param firestore - The Firestore instance.
     * @param key - The key to identify the global connection (optional).
     * @returns A promise that resolves when the connection is fully initialized.
     */
    static initGlobalConnection(firestore: Firestore | AdminFirestore, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): Promise<FirestoreOrmRepository> {
        const repository = new FirestoreOrmRepository(firestore);
        this.globalFirestores[key] = repository;
        
        // Create a promise that resolves when the repository is ready
        const readyPromise = repository.setupPromise.then(() => {
            if (this.globalWait[key]) {
                this.globalWait[key](repository);
            }
            return repository;
        });
        
        this.readyPromises[key] = readyPromise;
        return readyPromise;
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
        await this.initGlobalConnection(connection);
        return firebaseApp;
    }

    /**
     * Initializes Firebase Admin and sets up a global connection for Firestore ORM.
     * @param adminApp - The Firebase Admin app instance.
     * @param key - The key to identify the global connection (optional).
     * @returns The provided Firebase Admin app instance.
     */
    static async initializeAdminApp(adminApp: AdminApp, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
        try {
            // Dynamically import firebase-admin/firestore to avoid dependency requirements
            const adminFirestore = await import('firebase-admin/firestore');
            const connection = adminFirestore.getFirestore(adminApp);
            await this.initGlobalConnection(connection, key);
            return adminApp;
        } catch (error) {
            console.error("Error initializing Firebase Admin:", error);
            throw error;
        }
    }

    /**
     * Initializes a global storage for Firestore ORM.
     * @param storage - The Firebase storage instance.
     * @param key - The key to identify the global storage (optional).
     */
    static initGlobalStorage(storage: FirebaseStorage | AdminStorage, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
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
    static getGlobalStorage(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): FirebaseStorage | AdminStorage {
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
        if (this.readyPromises[key]) {
            return this.readyPromises[key];
        }
        if (this.globalFirestores[key]) {
            return Promise.resolve(this.globalFirestores[key]);
        }
        return new Promise((resolve) => {
            this.globalWait[key] = resolve;
        });
    }

    /**
     * Returns a promise that resolves when the global connection is ready.
     * This method provides a clean way to ensure initialization is complete.
     * @param key - The key to identify the global connection (optional).
     * @returns A promise that resolves when the connection is ready.
     */
    static ready(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): Promise<FirestoreOrmRepository> {
        return this.waitForGlobalConnection(key);
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
    getFirestore(): Firestore | AdminFirestore {
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