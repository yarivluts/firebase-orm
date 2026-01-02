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

// Note: We intentionally avoid importing firebase-admin types here to prevent
// bundlers from attempting to resolve admin dependencies in browser builds.
// Admin SDK types are only available in the '@arbel/firebase-orm/admin' entry point.

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
import { GlobalConfig } from "./interfaces/global.config.interface";
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
    static globalConfig: GlobalConfig = {
        auto_lower_case_field_name: false,
        auto_path_id: false,
        throw_on_required_field_null: false
    };
    static usedPathIds = new Set<string>();

    private setupPromise: Promise<void>;

    constructor(protected firestore: Firestore | any) {
        // For browser builds, only support Client SDK
        // Admin SDK should use the '@arbel/firebase-orm/admin' entry point
        this.setupPromise = this.setupClientSDKCompatibility();
        
        import('axios').then((module) => {
            axios = module.default;
        });
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
            // If we're in a Node.js environment without client SDK, that's okay
            // The admin entry point will handle setup differently
            if (typeof window === 'undefined') {
                // We're in Node.js, admin SDK will provide the functions
                console.log('Client SDK not available in Node.js environment - assuming Admin SDK will be used via admin entry point');
                FirestoreOrmRepository.isReady = true;
            } else {
                // We're in browser and client SDK failed to load - this is an error
                console.error("Failed to load Firebase client SDK in browser environment");
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
    static initGlobalConnection(firestore: Firestore | any, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): Promise<FirestoreOrmRepository> {
        // HMR Safety: Check if connection already exists and is the same instance
        if (this.globalFirestores[key]) {
            const existingRepo = this.globalFirestores[key];
            // If the firestore instance is the same, return the existing promise
            if (existingRepo.getFirestore() === firestore) {
                return this.readyPromises[key] || Promise.resolve(existingRepo);
            }
            // Different firestore instance, log a warning but allow re-initialization
            console.warn(`Reinitializing Firestore ORM connection for key '${key}' (HMR or config change detected)`);
        }
        
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
     * Initializes a global storage for Firestore ORM.
     * @param storage - The Firebase storage instance.
     * @param key - The key to identify the global storage (optional).
     */
    static initGlobalStorage(storage: FirebaseStorage | any, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
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
    static getGlobalStorage(key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): FirebaseStorage | any {
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
     * Sets the global configuration for the ORM.
     * @param config - The global configuration options.
     */
    static setGlobalConfig(config: Partial<GlobalConfig>) {
        this.globalConfig = { ...this.globalConfig, ...config };
    }

    /**
     * Gets the current global configuration.
     * @returns The current global configuration.
     */
    static getGlobalConfig(): GlobalConfig {
        return { ...this.globalConfig };
    }

    /**
     * Registers a path_id and validates it's unique globally.
     * @param pathId - The path_id to register.
     * @param modelName - The name of the model for error reporting.
     * @throws An error if the path_id is already in use.
     */
    static registerPathId(pathId: string, modelName: string): void {
        if (this.usedPathIds.has(pathId)) {
            throw new Error(`Path ID '${pathId}' is already in use by another model. Each model must have a unique path_id. Model '${modelName}' cannot use this path_id.`);
        }
        this.usedPathIds.add(pathId);
    }

    /**
     * Clears all registered path_ids. Useful for testing.
     */
    static clearRegisteredPathIds(): void {
        this.usedPathIds.clear();
    }

    /**
     * Ensures the repository setup is complete before using Firebase functions.
     * @returns A promise that resolves when setup is complete.
     */
    private async ensureSetupComplete(): Promise<void> {
        if (this.setupPromise) {
            await this.setupPromise;
        }
    }

    /**
     * Retrieves the collection or document reference based on the model object (synchronous version).
     * This method will throw an error if the setup is not complete.
     * Use getCollectionReferenceByModelAsync for proper async handling.
     * @param object - The model object.
     * @param isDoc - Indicates whether the reference should be a document reference (optional, default: false).
     * @param customId - The custom ID for the document reference (optional).
     * @returns The collection or document reference, or null if the path cannot be determined.
     */
    getCollectionReferenceByModel(object: any, isDoc: boolean = false, customId?: string): DocumentReference<DocumentData> | CollectionReference<DocumentData> | null {
        // Check if functions are available
        if (typeof collection !== 'function') {
            throw new Error('Firebase functions not initialized. Repository setup is not complete. Use async methods or ensure initGlobalConnection is awaited.');
        }
        
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
     * Retrieves the collection or document reference based on the model object (async version).
     * @param object - The model object.
     * @param isDoc - Indicates whether the reference should be a document reference (optional, default: false).
     * @param customId - The custom ID for the document reference (optional).
     * @returns The collection or document reference, or null if the path cannot be determined.
     */
    async getCollectionReferenceByModelAsync(object: any, isDoc: boolean = false, customId?: string): Promise<DocumentReference<DocumentData> | CollectionReference<DocumentData> | null> {
        await this.ensureSetupComplete();
        return this.getCollectionReferenceByModel(object, isDoc, customId);
    }

    /**
     * Retrieves the document reference based on the model object (synchronous version).
     * @param object - The model object.
     * @param customId - The custom ID for the document reference (optional).
     * @returns The document reference, or null if the path cannot be determined.
     */
    getDocReferenceByModel(object: any, customId?: string): DocumentReference<DocumentData> | null {
        return this.getCollectionReferenceByModel(object, true, customId) as DocumentReference<DocumentData> | null;
    }

    /**
     * Retrieves the document reference based on the model object (async version).
     * @param object - The model object.
     * @param customId - The custom ID for the document reference (optional).
     * @returns The document reference, or null if the path cannot be determined.
     */
    async getDocReferenceByModelAsync(object: any, customId?: string): Promise<DocumentReference<DocumentData> | null> {
        return await this.getCollectionReferenceByModelAsync(object, true, customId) as DocumentReference<DocumentData> | null;
    }

    /**
     * Retrieves the Firestore instance.
     * @returns The Firestore instance.
     */
    getFirestore(): Firestore | any {
        return this.firestore;
    }

    /**
     * Retrieves the model object based on the model class.
     * @param model - The model class.
     * @returns The model object.
     * @throws Error if model is not a valid constructor
     */
    getModel<T>(model: { new(): T; }): T & BaseModel {
        if (!model || typeof model !== 'function') {
            throw new Error(
                'getModel requires a valid model constructor. ' +
                `Received: ${typeof model}. ` +
                'This can happen if the model class reference is lost during serialization or in subcollection mapping. ' +
                'Ensure the model is properly imported and not destructured.'
            );
        }
        
        var m: any | T = model;
        try {
            var object: any = new m();
            object.setRepository(this);
            object.setModelType(model);
            object.currentModel = object;
            object._createdViaGetModel = true;
            return <T & BaseModel>object;
        } catch (error) {
            throw new Error(
                `Failed to instantiate model. ` +
                `Error: ${error.message}. ` +
                `This can happen if the model class is not properly defined or imported. ` +
                `Model type: ${model.name || 'unknown'}`
            );
        }
    }

    /**
     * Loads a model object by its ID.
     * @param object - The model class.
     * @param id - The ID of the model object.
     * @param params - The path parameters (optional).
     * @returns A promise that resolves to the model object.
     */
    async load(object: any, id: string, params: { [key: string]: string; } = {}): Promise<ModelInterface> {
        await this.ensureSetupComplete();
        
        // Validate Firebase query functions are available
        if (typeof getDocs !== 'function' || typeof query !== 'function' || typeof where !== 'function' || typeof documentId !== 'function') {
            throw new Error('Firebase query functions not initialized. Repository setup is not complete. Ensure initGlobalConnection is awaited.');
        }
        
        for (let key in params) {
            let value = params[key];
            object[key] = value;
        }
        var ref = await this.getCollectionReferenceByModelAsync(object) as CollectionReference<DocumentData>;
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
        await this.ensureSetupComplete();
        
        // Validate Firebase update/set functions are available
        if (typeof updateDoc !== 'function' || typeof setDoc !== 'function') {
            throw new Error('Firebase update/set functions not initialized. Repository setup is not complete. Ensure initGlobalConnection is awaited.');
        }
        
        var object: ModelInterface = model;
        var ref = await this.getDocReferenceByModelAsync(object, object.getId() ?? customId);
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