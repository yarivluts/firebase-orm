import * as firebase from "firebase/app";
import 'firebase/firestore';
import { ModelInterface } from "./interfaces/model.interface";
import { ModelAllListOptions } from "./interfaces/model.alllist.options.interface";

export enum LIST_EVENTS {
  REMOVED = "removed",
  MODIFIED = "modified",
  ADDEDD = "added",
  INITIALIZE = "initialize"
}
export enum WHERE_FILTER_OP {
  NOT_EQUAL = "!="
}

export class Query {
  protected current!: firebase.firestore.Query;
  protected model!: ModelInterface;
  protected orWhereList:any[] = [];
  protected orderByList:any[] = [];
  protected queryLimit! : number;

  init(model: ModelInterface) {
    this.model = model;
    this.current = this.model.getReference();
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
    fieldPath: string | firebase.firestore.FieldPath,
    opStr: firebase.firestore.WhereFilterOp | WHERE_FILTER_OP,
    value: any
  ): Query {
    if(opStr == WHERE_FILTER_OP.NOT_EQUAL){
      this.current = this.current.where(fieldPath, '<', value).where(fieldPath, '>', value);
    }else{
      var nativeOp : any = opStr;
      this.current = this.current.where(fieldPath, nativeOp, value);
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
    fieldPath: string | firebase.firestore.FieldPath,
    opStr: firebase.firestore.WhereFilterOp | WHERE_FILTER_OP,
    value: any
  ): Query {

    this.orWhereList.push({
      fieldPath : fieldPath,
      opStr : opStr,
      value : value
    })
    
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
    fieldPath: string | firebase.firestore.FieldPath,
    directionStr?: firebase.firestore.OrderByDirection
  ): Query {
    this.orderByList.push({
      fieldPath : fieldPath,
      directionStr : directionStr
    })
    this.current = this.current.orderBy(fieldPath, directionStr);
    return this;
  }

  /**
   * Creates and returns a new Query where the results are limited to the
   * specified number of documents.
   *
   * @param limit The maximum number of items to return.
   * @return The created Query.
   */
  limit(limit: number): Query {
    this.queryLimit = limit;
    this.current = this.current.limit(limit);
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
  on(callback: CallableFunction, event_type?: LIST_EVENTS) {
    var that = this;
    return this.current.onSnapshot(function(querySnapshot) {
      var result = that.parse(querySnapshot);
      if (event_type) {
        querySnapshot.docChanges().forEach(function(change) {
          if (change.type === LIST_EVENTS.ADDEDD) {
            var result = that.parseFromData(change.doc.data(), change.doc.id);
            callback(result);
            // This is equivalent to child_added
          } else if (change.type === LIST_EVENTS.MODIFIED) {
            var result = that.parseFromData(change.doc.data(), change.doc.id);
            callback(result);
            // This is equivalent to child_changed
          } else if (change.type === LIST_EVENTS.REMOVED) {
            var result = that.parseFromData(change.doc.data(), change.doc.id);
            callback(result);
            // This is equivalent to child_removed
          } else {
          }
        });
      } else {
        var result = that.parse(querySnapshot);
        callback(result);
      }
    });
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
  onMode(options : ModelAllListOptions) {
    var that = this;
    var now = new Date().getTime();
    return this.current.onSnapshot(async function(querySnapshot) {
      for(var i = 0;i < querySnapshot.docChanges().length;i++){
        var change = querySnapshot.docChanges()[i];
        if (change.type === LIST_EVENTS.ADDEDD && (options.added || options.init)) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            if(result.created_at && result.created_at > now && options.added){
                options.added(result); 
            }else if(options.init){
                options.init(result); 
            }
            
            // This is equivalent to child_added
          } else if (change.type === LIST_EVENTS.MODIFIED && options.modified) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            options.modified(result); 
            // This is equivalent to child_changed
          } else if (change.type === LIST_EVENTS.REMOVED && options.removed) {
            let result = that.parseFromData(change.doc.data(), change.doc.id);
            //console.log("Removed model: ",that.model.getCurrentModel().getReferencePath(),change.doc.data(), result);
            options.removed(result); 
            // This is equivalent to child_removed
          }
      }  
    });
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
  startAt(...fieldValues: any[]): Query {
    this.current = this.current.startAt(fieldValues);
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
  startAfter(snapshot: firebase.firestore.DocumentSnapshot): Query {
    this.current = this.current.startAfter(snapshot);
    return this;
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
  endBefore(...fieldValues: any[]): Query {
    this.current = this.current.endBefore(fieldValues);
    return this;
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
  endAt(...fieldValues: any[]): Query {
    this.current = this.current.endAt(fieldValues);
    return this;
  }

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
  async get(
    options?: firebase.firestore.GetOptions
  ): Promise<Array<ModelInterface>> {
    if(this.orWhereList.length > 0){
      return await this.getWithAdvancedFilter(options);
    }else{
      var list = await this.current.get(options);
      return this.parse(list);
    }
  }
   
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
  async getWithAdvancedFilter(
    options?: firebase.firestore.GetOptions
  ): Promise<Array<ModelInterface>> {
    var resultList : any[] = [];
    var result : any[] = [];
    var promiseAllList:any[] = []
    var currentQuery : any;
    this.orWhereList.forEach((row) => {
      currentQuery = Object.assign({},this.current);
      currentQuery.where(row.fieldPath,row.opStr,row.value);
      promiseAllList.push((async () => {
        var queryResult = await currentQuery.get(options);
        resultList.push(this.parse(queryResult));
        return queryResult;
      })())
    });

    await Promise.all(promiseAllList);

    this.orderByList.forEach(order => {
      resultList.sort((a,b) => {
          if(typeof a[order.fieldPath] !== 'undefined' && typeof b[order.fieldPath] !== 'undefined'){
            if(order.directionStr == 'asc' || !order.directionStr){
             return a[order.fieldPath] - b[order.fieldPath];
            }else{
              return b[order.fieldPath] - a[order.fieldPath];
            }
          }else{
            return 1;
          }
      })
    })
    if(this.queryLimit){
      result = resultList.slice(0,this.queryLimit);
    }else{
      result = resultList;
    }
   return result;
  }
  

  
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
  async getOne(
    options?: firebase.firestore.GetOptions
  ): Promise<ModelInterface | null>{
    this.limit(1);
    var list = await this.current.get(options);
    var res = this.parse(list);
    if(res.length > 0){
      return res[0];
    }else{
      return null;
    }

  }

  public parse(list: firebase.firestore.QuerySnapshot) {
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
