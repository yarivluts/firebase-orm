import { ModelAllListOptions } from "./interfaces/model.alllist.options.interface";
import { BaseModel } from "./base.model";
import { FirestoreOrmRepository } from "./repository";

import type { QuerySnapshot, CollectionReference, DocumentData, FieldPath, Query as FirestoreQuery, OrderByDirection, WhereFilterOp, } from "firebase/firestore";

export enum LIST_EVENTS {
  REMOVED = "removed",
  MODIFIED = "modified",
  ADDEDD = "added",
  INITIALIZE = "init"
}
export enum WHERE_FILTER_OP {
  NOT_EQUAL = "<>"
}

let endAt: typeof import("firebase/firestore").endAt;
let endBefore: typeof import("firebase/firestore").endBefore;
let getCountFromServer: typeof import("firebase/firestore").getCountFromServer;
let getDocs: typeof import("firebase/firestore").getDocs;
let limit: typeof import("firebase/firestore").limit;
let onSnapshot: typeof import("firebase/firestore").onSnapshot;
let or: typeof import("firebase/firestore").or;
let and: typeof import("firebase/firestore").and;
let orderBy: typeof import("firebase/firestore").orderBy;
let query: typeof import("firebase/firestore").query;
let startAfter: typeof import("firebase/firestore").startAfter;
let startAt: typeof import("firebase/firestore").startAt;
let where: typeof import("firebase/firestore").where;
let collectionGroup: typeof import("firebase/firestore").collectionGroup;

/**
 * Check if we're using Admin SDK
 */
function isAdminFirestore(firestore: any): boolean {
    return typeof firestore.collection === 'function' && 
           typeof firestore.doc === 'function' &&
           (firestore._settings !== undefined || firestore.toJSON !== undefined);
}

/**
 * Setup Admin SDK compatibility for query functions
 */
function setupAdminSDKQueryCompatibility(): void {
    console.log("Setting up Admin SDK query compatibility");
    
    endAt = ((...values: any[]) => ({
        apply: (ref: any) => ref.endAt(...values)
    })) as any;
    
    endBefore = ((...values: any[]) => ({
        apply: (ref: any) => ref.endBefore(...values)
    })) as any;
    
    getCountFromServer = ((query: any) => {
        console.warn("getCountFromServer not directly supported in Admin SDK - returning approximate count");
        return query.get().then((snapshot: any) => ({
            data: () => ({ count: snapshot.size })
        }));
    }) as any;
    
    getDocs = ((query: any) => query.get()) as any;
    
    limit = ((limitCount: number) => ({
        apply: (ref: any) => ref.limit(limitCount)
    })) as any;
    
    onSnapshot = ((query: any, callback: any) => query.onSnapshot(callback)) as any;
    
    or = ((...queries: any[]) => ({
        apply: (ref: any) => {
            console.warn("OR queries not directly supported in Admin SDK - using first query only");
            return queries.length > 0 ? queries[0].apply(ref) : ref;
        }
    })) as any;
    
    and = ((...queries: any[]) => ({
        apply: (ref: any) => {
            let result = ref;
            for (const query of queries) {
                if (query && typeof query.apply === 'function') {
                    result = query.apply(result);
                }
            }
            return result;
        }
    })) as any;
    
    orderBy = ((field: string, direction?: 'asc' | 'desc') => ({
        apply: (ref: any) => ref.orderBy(field, direction)
    })) as any;
    
    query = ((ref: any, ...constraints: any[]) => {
        let result = ref;
        for (const constraint of constraints) {
            if (constraint && typeof constraint.apply === 'function') {
                result = constraint.apply(result);
            }
        }
        return result;
    }) as any;
    
    startAfter = ((...values: any[]) => ({
        apply: (ref: any) => ref.startAfter(...values)
    })) as any;
    
    startAt = ((...values: any[]) => ({
        apply: (ref: any) => ref.startAt(...values)
    })) as any;
    
    where = ((field: string, op: string, value: any) => ({
        apply: (ref: any) => ref.where(field, op, value)
    })) as any;
    
    collectionGroup = ((collectionId: string) => {
        const connection = FirestoreOrmRepository.getGlobalConnection();
        const firestore = connection.getFirestore() as any;
        return firestore.collectionGroup(collectionId);
    }) as any;
}

/**
 * Setup Client SDK compatibility for query functions
 */
async function setupClientSDKQueryCompatibility(): Promise<void> {
    try {
        const module = await import("firebase/firestore");
        endAt = module.endAt;
        endBefore = module.endBefore;
        getCountFromServer = module.getCountFromServer;
        getDocs = module.getDocs;
        limit = module.limit;
        onSnapshot = module.onSnapshot;
        or = module.or;
        and = module.and;
        orderBy = module.orderBy;
        query = module.query;
        startAfter = module.startAfter;
        startAt = module.startAt;
        where = module.where;
        collectionGroup = module.collectionGroup;
    } catch (error) {
        console.warn("Failed to load Client SDK, trying Admin SDK compatibility");
        setupAdminSDKQueryCompatibility();
    }
}

/**
 * Initialize query functions based on detected SDK
 */
async function lazyLoadFirestoreImports() {
  if (!!endAt) {
    return;
  }

  // Check if we can detect the SDK type from a global connection
  try {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    
    if (isAdminFirestore(firestore)) {
        setupAdminSDKQueryCompatibility();
    } else {
        await setupClientSDKQueryCompatibility();
    }
  } catch (error) {
    // No global connection yet, try to load Client SDK first
    await setupClientSDKQueryCompatibility();
  }
}

lazyLoadFirestoreImports();

/**
 * Represents a query for retrieving documents from a Firestore collection.
 * @template T The type of the documents returned by the query.
 */
export class Query<T> {
  protected current!: CollectionReference<DocumentData>;
  protected model!: BaseModel;
  protected queryList: any[] = [];
  protected whereList: any[] = [];
  protected orWhereList: any[] = [];
  protected orderByList: any[] = [];
  protected ops: any[] = [];
  protected startAfterArr: BaseModel[] = [];
  protected endBeforeArr: BaseModel[] = [];
  protected queryLimit!: number;
  protected currentRef!: CollectionReference;
  protected isCollectionGroup_: boolean = false;

  init(model: BaseModel, reference?: FirestoreQuery | any, isCollectionGroup?: boolean) {

    this.model = model;
    if (!reference && !isCollectionGroup) {
      this.current = this.model.getRepositoryReference() as CollectionReference<DocumentData>;
    }

    if (isCollectionGroup) {
      this.isCollectionGroup_ = isCollectionGroup;
    }


  }

  /**
   * Sets whether the query is targeting a collection group.
   * 
   * @param isCollectionGroup - A boolean value indicating whether the query is targeting a collection group.
   * @returns The updated Query object.
   */
  setCollectionGroup(isCollectionGroup: boolean) {
    this.isCollectionGroup_ = isCollectionGroup;
    return this;
  }

  /**
   * Creates and returns a new Query with the additional filter that documents
   * must contain the specified field and the value should satisfy the
   * relation constraint provided.
   *
   * @param fieldPath The path to compare
   * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
   * @param value The value for comparison
   * @return The created Query.
   */
  where(
    fieldPath: string | FieldPath,
    opStr: WhereFilterOp | WHERE_FILTER_OP,
    value: any
  ): Query<T> {
    var field: any = fieldPath;
    fieldPath = this.model.getFieldName(field);

    this.queryList.push(this.current);
    if (opStr == WHERE_FILTER_OP.NOT_EQUAL) {
      this.whereList.push(or(where(fieldPath, '<', value), where(fieldPath, '>', value)));
    } else {
      var nativeOp: any = opStr;
      this.whereList.push(where(fieldPath, nativeOp, value));
    }

    return this;
  }


  /**
   * Test Mode - Or operation for additional filter that documents
   * must contain the specified field and the value should satisfy the
   * relation constraint provided.
   *
   * @param fieldPath The path to compare
   * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
   * @param value The value for comparison
   * @return The created Query.
   */
  orWhere(
    fieldPath: string | FieldPath,
    opStr: WhereFilterOp | WHERE_FILTER_OP,
    value: any
  ): Query<T> {
    var field: any = fieldPath;
    fieldPath = this.model.getFieldName(field);
    this.orWhereList.push(where(fieldPath, opStr as any, value));
    return this;
  }

  /**
   * Creates and returns a new Query that's additionally sorted by the
   * specified field, optionally in descending order instead of ascending.
   *
   * @param fieldPath The field to sort by.
   * @param directionStr Optional direction to sort by (`asc` or `desc`). If
   * not specified, order will be ascending.
   * @return The created Query.
   */
  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: OrderByDirection
  ): Query<T> {
    var field: any = fieldPath;
    fieldPath = this.model.getFieldName(field);
    this.orderByList.push(orderBy(fieldPath, directionStr));
    return this;
  }

  /**
   * Creates and returns a new Query where the results are limited to the
   * specified number of documents.
   *
   * @param limit The maximum number of items to return.
   * @return The created Query.
   */
  limit(val: number): Query<T> {
    this.queryLimit = val;
    this.ops.push((limit(val)));
    return this;
  }

  like(fieldName: string, find: string): Query<T> {
    var field: any = fieldName;
    fieldName = this.model.getFieldName(field);
    find = (find + '').toLowerCase();
    var likePrefix = '~~~';
    if (this.model['textIndexingFields'] && this.model['textIndexingFields'][this.model.getFieldName(fieldName)]) {
      if (!find.startsWith('%')) {
        find = likePrefix + find;
      }
      if (!find.endsWith('%')) {
        find = find + likePrefix;
      }
      find = find.replace(/%/g, '');
      this.whereList.push(where('text_index_' + this.model.getFieldName(fieldName), 'array-contains', find));
    }

    return this;
  }

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
  on(callback: CallableFunction, event_type: LIST_EVENTS = LIST_EVENTS.INITIALIZE): CallableFunction {
    var params = {};
    params[event_type] = callback;
    return this.onMode(params);
  }

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
  onMode(options: ModelAllListOptions): CallableFunction {

    var response: any = {
      callback: null
    };
    this.initBeforeFetch().then(() => {
      var that = this;
      var now = new Date().getTime();
      response.callback = onSnapshot(this.current, async function (querySnapshot: any) {
        for (var i = 0; i < querySnapshot.docChanges().length; i++) {
          var change = querySnapshot.docChanges()[i];
          if (change.type === LIST_EVENTS.ADDEDD && (options.added || options.init)) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            if (result.created_at && result.created_at > now && options.added) {
              options.added(result);
            } else if (options.init) {
              options.init(result);
            }
            // This is equivalent to child_added
          } else if (change.type === LIST_EVENTS.MODIFIED && options.modified) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            options.modified(result);
            // This is equivalent to child_changed
          } else if (change.type === LIST_EVENTS.REMOVED && options.removed) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            //printLog("Removed model: ",that.model.getCurrentModel().getReferencePath(),change.doc.data(), result);
            options.removed(result);
            // This is equivalent to child_removed
          }
        }
      });
    })
    var res = () => {
      if (response.callback) {
        response.callback();
      } else {
        setTimeout(function () {
          res();
        }, 1000);
      }
    }
    return res;
  }

  /**
   * Creates and returns a new Query that starts at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to start this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  startAt(...fieldValues: any[]): Query<T> {
    this.whereList.push(startAt(...fieldValues));
    return this;
  }

  /**
   * Creates and returns a new Query that starts after the provided document
   * (exclusive). The starting position is relative to the order of the query.
   * The document must contain all of the fields provided in the orderBy of
   * this query.
   *
   * @param snapshot The snapshot of the document to start after.
   * @return The created Query.
   */
  startAfter(ormObject: BaseModel): Query<T> {
    this.startAfterArr.push(ormObject);
    return this;
  }

  async initStartAfter() {
    for (var i = 0; i < this.startAfterArr.length; i++) {
      var ormObject = this.startAfterArr[i];
      var doc = await ormObject.getSnapshot();
      this.whereList.push(startAfter(doc));
      for (var i = 0; this.orWhereList.length > i; i++) {
        this.orWhere[i].queryObject = this.orWhere[i].queryObject.startAfter(doc);
      }
    }
  }

  /**
   * Creates and returns a new Query that ends before the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query before, in order
   * of the query's order by.
   * @return The created Query.
   */
  endBefore(ormObject: BaseModel): Query<T> {
    this.endBeforeArr.push(ormObject);
    return this;
  }

  async initEndBefore() {
    for (var i = 0; i < this.endBeforeArr.length; i++) {
      var ormObject = this.endBeforeArr[i];
      var doc = await ormObject.getSnapshot();
      this.whereList.push((endBefore(doc)));
      for (var i = 0; this.orWhereList.length > i; i++) {
        this.orWhere[i].queryObject = this.orWhere[i].queryObject.endBefore(doc);
      }
    }
  }

  /**
   * Creates and returns a new Query that ends at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  endAt(...fieldValues: any[]): Query<T> {
    this.whereList.push((endAt(...fieldValues)));

    for (var i = 0; this.orWhereList.length > i; i++) {
      this.orWhereList[i].queryObject = this.orWhereList[i].queryObject.endAt(...fieldValues);
    }
    return this;
  }

  /**
   * Executes the query and returns the results as a `QuerySnapshot`.
   *
   * @return A Promise that will be resolved with the results of the Query.
   */
  async get(
  ): Promise<Array<BaseModel & T>> {
    await this.initBeforeFetch();
    const list = await getDocs(this.getFirestoreQuery());
    return this.parse(list);
  }

  async getRowList(
  ): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    await this.initBeforeFetch();
    const list = await getDocs(this.getFirestoreQuery());
    return list;
  }
  
  async count(
  ): Promise<Number> {
    await this.initBeforeFetch();
    const q = await this.getFirestoreQuery();
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  }

  getCurrentQueryArray(): Array<any> {
    const res = [and(...this.whereList.filter((op) => {
      return op.type == 'where' || op.type == 'or';
    }, or(...this.orWhereList))), ...this.orderByList, ...this.ops];

    return res;
  }

  getFirestoreQuery() {
    if (this.isCollectionGroup_) {
      return query(collectionGroup(this.model.getRepository().getFirestore() as any, this.model.getCollectionName()), ...this.getCurrentQueryArray());
    } else {
      return query(this.current, ...this.getCurrentQueryArray());
    }
  }

  async initBeforeFetch() {
    await this.initStartAfter();
    await this.initEndBefore();
    return this;
  }

  /**
   * Executes the query and returns the results as a `QuerySnapshot`.
   * @return A Promise that will be resolved with the results of the Query.
   */
  async getOne(
  ): Promise<BaseModel | null> {
    await this.initBeforeFetch();
    this.limit(1);
    let list;
    list = await getDocs(this.getFirestoreQuery());
    var res = this.parse(list);
    if (res.length > 0) {
      return res[0];
    } else {
      return null;
    }
  }

  public parse(list: any) {//FirestoreQuerySnapshot
    var result = [];
    for (var i = 0; i < list.docs.length; i++) {

      let object: any = this.model.getCurrentModel();
      let data = list.docs[i].data();
      let id = list.docs[i].id;
      let ref = list.docs[i].ref;
      let path = list.docs[i].ref.path;
      if (this.isCollectionGroup_) {
        object.initPathFromStr(path);
      }
      object.setId(id);
      object.initFromData(data);
      result.push(object);
    }
    return result;
  }

  public parseFromData(data: any, id?: string) {
    var result = [];
    let object: any = this.model.getCurrentModel();
    if (id) {
      object.setId(id);
    }
    object.initFromData(data);
    return object;
  }
}
