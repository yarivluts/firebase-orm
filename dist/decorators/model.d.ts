import { ModelInterface } from "../interfaces/model.interface";
import { FirestoreOrmRepository } from "../repository";
import * as firebase from "firebase";
import { Query } from "../query";
import "firesql/rx";
interface ModelOptions {
    /**
     * Reference path - for example accounts/:account_id/websites
     */
    reference_path: string;
    /**
     * Path Id - unique code for model id inside the refernce path - for example account_id
     */
    path_id: string;
}
export declare function Model(options: ModelOptions): <T extends new (...args: any[]) => {}>(constructor: T) => {
    new (...args: any[]): {
        id: string;
        referencePath: string;
        pathId: string;
        documentData: any;
        repository: FirestoreOrmRepository;
        currentQuery: any;
        modelType: any;
        getId(): string;
        getPathId(): string;
        getOneRel<T>(model: new () => T): Promise<T & ModelInterface>;
        getManyRel<T>(model: new () => T): Promise<(T & ModelInterface)[]>;
        getModel<T>(model: new () => T): T & ModelInterface;
        getReference(): firebase.firestore.CollectionReference;
        setModelType(model: any): any;
        getModelType(): any;
        where(fieldPath: string, opStr: firebase.firestore.WhereFilterOp, value: any): Query;
        getOne(): Promise<any>;
        setId(id: string): any;
        load(id: string, params?: {
            [key: string]: string;
        }): Promise<ModelInterface | null>;
        getQuery(): Query;
        getAll(whereArr: {
            fieldPath: string;
            opStr: firebase.firestore.WhereFilterOp;
            value: any;
        }[], orderBy?: {
            fieldPath: string | firebase.firestore.FieldPath;
            directionStr?: "desc" | "asc" | undefined;
        } | undefined, limit?: number | undefined, params?: {
            [key: string]: string;
        } | undefined): any[];
        getRepository(): FirestoreOrmRepository;
        setRepository(repository: FirestoreOrmRepository): any;
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        on(callback: CallableFunction): void;
        sql(sql: string, asObject?: boolean, isInsideQuery?: boolean): Promise<any[]>;
        onSql(sql: string, callback: CallableFunction, asObject?: boolean, isInsideQuery?: boolean): void;
        createFromDoc(doc: firebase.firestore.DocumentSnapshot): any;
        createFromData(data: Object): any;
        initFromDoc(doc: firebase.firestore.DocumentSnapshot): any;
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onList(callback: CallableFunction): void;
        save(): Promise<any>;
        getReferencePath(): string;
        getRequiredFields(): string[];
        verifyRequiredFields(): boolean;
        getDocumentData(): Object;
        getPathList(): boolean | {
            type: string;
            value: string;
        }[];
        getPathListParams(): any;
        getPathListKeys(): string[];
    };
    requiredFields: string[];
} & T;
export {};
