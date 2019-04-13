import * as firebase from 'firebase';
import { ModelInterface } from './interfaces/model.interface';
export declare class Query {
    protected model: ModelInterface;
    protected current: firebase.firestore.Query;
    protected constructor(model: ModelInterface);
    /**
     * Creates and returns a new Query with the additional filter that documents
     * must contain the specified field and the value should satisfy the
     * relation constraint provided.
     *
     * @param fieldPath The path to compare
     * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
     * @param value The value for comparison
     * @return The created Query.
     */
    where(fieldPath: string | firebase.firestore.FieldPath, opStr: firebase.firestore.WhereFilterOp, value: any): Query;
    /**
     * Creates and returns a new Query that's additionally sorted by the
     * specified field, optionally in descending order instead of ascending.
     *
     * @param fieldPath The field to sort by.
     * @param directionStr Optional direction to sort by (`asc` or `desc`). If
     * not specified, order will be ascending.
     * @return The created Query.
     */
    orderBy(fieldPath: string | firebase.firestore.FieldPath, directionStr?: firebase.firestore.OrderByDirection): Query;
    /**
     * Creates and returns a new Query where the results are limited to the
     * specified number of documents.
     *
     * @param limit The maximum number of items to return.
     * @return The created Query.
     */
    limit(limit: number): Query;
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
    /**
     * Creates and returns a new Query that starts at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to start this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    startAt(...fieldValues: any[]): Query;
    /**
     * Creates and returns a new Query that starts after the provided document
     * (exclusive). The starting position is relative to the order of the query.
     * The document must contain all of the fields provided in the orderBy of
     * this query.
     *
     * @param snapshot The snapshot of the document to start after.
     * @return The created Query.
     */
    startAfter(snapshot: firebase.firestore.DocumentSnapshot): Query;
    /**
     * Creates and returns a new Query that ends before the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query before, in order
     * of the query's order by.
     * @return The created Query.
     */
    endBefore(...fieldValues: any[]): Query;
    /**
     * Creates and returns a new Query that ends at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    endAt(...fieldValues: any[]): Query;
    /**
     * Executes the query and returns the results as a `QuerySnapshot`.
     *
     * Note: By default, get() attempts to provide up-to-date data when possible
     * by waiting for data from the server, but it may return cached data or fail
     * if you are offline and the server cannot be reached. This behavior can be
     * altered via the `GetOptions` parameter.
     *
     * @param options An object to configure the get behavior.
     * @return A Promise that will be resolved with the results of the Query.
     */
    get(options?: firebase.firestore.GetOptions): Promise<Array<ModelInterface>>;
    parse(list: firebase.firestore.QuerySnapshot): any[];
}
