import * as firebase from "firebase";
import { ModelInterface } from "./interfaces/model.interface";
import 'firesql/rx';
export declare class FirestoreOrmRepository {
    protected firestore: firebase.firestore.Firestore;
    static documentsRequiredFields: {};
    constructor(firestore: firebase.firestore.Firestore);
    getReferenceByModel(object: ModelInterface): any;
    getModel<T>(model: {
        new (): T;
    }): T & ModelInterface;
    sql(sql: string): Promise<Array<Object>>;
    /**
     * Listen to sql query result
     * @param sql - sql query
     * @param callback - running callback
     */
    onSql(sql: string, callback: CallableFunction): void;
    /**
     * Load model object by id
     * @param object - class
     * @param id -string id
     * @param params - path params
     * @return model object
     */
    load(object: any, id: string, params?: {
        [key: string]: string;
    }): Promise<ModelInterface | null>;
    /**
     * Save the model object
     * @param model
     */
    save(model: any): Promise<false | ModelInterface>;
}
