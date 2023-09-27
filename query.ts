import * as firebase from "firebase/app";
import 'firebase/firestore';
import { ModelInterface } from "./interfaces/model.interface";
import { ModelAllListOptions } from "./interfaces/model.alllist.options.interface";
import { BaseModel } from "./base.model";
import { CollectionReference, DocumentData, FieldPath, Query as FirestoreQuery, OrderByDirection, WhereFilterOp, and, endAt, endBefore, getCountFromServer, getDocs, limit, onSnapshot, or, orderBy, query, startAfter, startAt, where } from "firebase/firestore";

export enum LIST_EVENTS {
  REMOVED = "removed",
  MODIFIED = "modified",
  ADDEDD = "added",
  INITIALIZE = "init"
}
export enum WHERE_FILTER_OP {
  NOT_EQUAL = "<>"
}

export class Query<T> {
  protected current!: CollectionReference<DocumentData>;
  protected model!: BaseModel;
  protected queryList: any[] = [];
  protected whereList: any[] = [];
  protected orWhereList: any[] = [];
  protected orderByList: any[] = [];
  protected startAfterArr: BaseModel[] = [];
  protected endBeforeArr: BaseModel[] = [];
  protected queryLimit!: number;
  protected currentRef!: CollectionReference;
  init(model: BaseModel, reference?: FirestoreQuery | any) {
    this.model = model;
    if (!reference) {
      this.current = this.model.getRepositoryReference() as CollectionReference<DocumentData>;
    }
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
    this.whereList.push(or(where(fieldPath, opStr as any, value)));
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
    this.whereList.push((orderBy(fieldPath, directionStr)));
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
    this.whereList.push((limit(val)));
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
      response.callback = onSnapshot(this.current, async function (querySnapshot) {
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
    const list = await getDocs(query(this.current, ...this.whereList));
    return this.parse(list);
  }

  async count(
  ): Promise<Number> {
    await this.initBeforeFetch();
    const q = await query(query(this.current, ...this.whereList));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
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
    var list = await getDocs(query(this.current, ...this.whereList));
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
