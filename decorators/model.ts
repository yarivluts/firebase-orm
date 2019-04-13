import { ModelInterface } from "../interfaces/model.interface"; 
import { FirestoreOrmRepository } from "../repository";
import * as firebase from "firebase";
import { FireSQL } from "firesql";
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
  path_id : string
}

export function Model(options: ModelOptions) {
  return function<T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor implements ModelInterface {
       id!: string;
       referencePath: string = options.reference_path;
       pathId: string = options.path_id;
       documentData: any = {};
      static requiredFields: Array<string> = [];
       repository!: FirestoreOrmRepository;
       currentQuery!: any;
       modelType!: any;

      getId() {
        return this.id;
      }

      getPathId() {
        return this.pathId;
      }

      async getOneRel<T>(model: { new (): T }): Promise<T & ModelInterface>   {
        var object : any = this.getModel(model);
        return await object.load(this[object.getPathId()]);
      }
      
      async getManyRel<T>(model: { new (): T }): Promise<Array<T & ModelInterface>> {
        var object : any = this.getModel(model);
        return await object.where(object.getPathId(),'==',this[object.getPathId()]).get();
      }

      getModel<T>(model: { new (): T }): T & ModelInterface {
        var object:any = this.getRepository().getModel(this.getModelType());
        var keys = object.getPathListKeys();
        for(var i = 0; i < keys.length;i++){
          var key = keys[i];
          if(this[key]){
            object[key] = this[key];
          }
        }
        return object;
      }

      getReference(): firebase.firestore.CollectionReference {
        return this.getRepository().getReferenceByModel(this);
      }

      setModelType(model:any):this {
        this.modelType = model;
        return this;
      }

      getModelType() {
        return this.modelType;
      }


      where(
        fieldPath: string,
        opStr: firebase.firestore.WhereFilterOp,
        value: any
      ): Query {
        var that = this;
        var query = this.getQuery().where(fieldPath, opStr, value);
        return query;
      }

      async getOne() {
        if (!this.currentQuery) {
          var that : any = this;
          this.currentQuery = this.getRepository().getReferenceByModel(that);
        }
        return await this.currentQuery.get();
      }

      setId(id: string) {
        this.id = id;
        return this;
      }

      async load(
        id: string,
        params: { [key: string]: string } = {}
      ): Promise<ModelInterface | null> {
        this.setId(id);
        if (this.getRepository()) {
          return await this.getRepository().load(this, id, params);
        } else {
          console.error("No repository!");
        }
        return null;
      }


      getQuery(): Query {
        var that : any = this;
        return new Query(that);
      }

      getAll(
        whereArr: Array<{
          fieldPath: string;
          opStr: firebase.firestore.WhereFilterOp;
          value: any;
        }>,
        orderBy?: {
          fieldPath: string | firebase.firestore.FieldPath;
          directionStr?: firebase.firestore.OrderByDirection;
        },
        limit?: number,
        params?: { [key: string]: string }
      ): Array<this> {
        return [this];
      }

      getRepository() {
        return this.repository;
      }

      setRepository(repository: FirestoreOrmRepository) {
        this.repository = repository;
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
      on(callback: CallableFunction): void {
        var that = this;
        if (!this.getId()) {
          console.error("The model not stored yet");
        } else {
          var doc = this.getReference()
            .doc(this.getId())
            .onSnapshot(documentSnapshot => {
              var data = documentSnapshot.data();
              for (let key in data) {
                let value = data[key];
                this[key] = value;
              }
              callback(this);
            });
        }
      }

      async sql(
        sql: string,
        asObject: boolean = false,
        isInsideQuery = false
      ): Promise<Array<this>> {
        var result:any = [];
        if (isInsideQuery && !this.getId()) {
          console.log("Can't search inside a model without id!");
          return result;
        }
        var ref:any = !isInsideQuery
          ? this.getReference().parent
          : this.getReference().doc(this.getId());
        const fireSQL = new FireSQL(ref, { includeId: "id" });
        try {
          var sqlResult = await fireSQL.query(sql);
          for (var i = 0; i < sqlResult.length; i++) {
            let data = sqlResult[i];
            if (asObject) {
              result.push(this.createFromData(data));
            } else {
              result.push(data);
            }
          }
          return result;
        } catch (error) {
          console.log("SQL GENERAL ERROR - ", error);
          return result;
        }
      }

       onSql(
        sql: string,
        callback: CallableFunction,
        asObject: boolean = false,
        isInsideQuery: boolean = false
      ): void {
        var result:any = [];
        if (isInsideQuery && !this.getId()) {
          console.log("Can't search inside a model without id!");
        } else {
          var ref:any = !isInsideQuery
            ? this.getReference().parent
            : this.getReference().doc(this.getId());
          const fireSQL = new FireSQL(ref, { includeId: "id" });
          try {
            const res = fireSQL.rxQuery(sql);
            res.subscribe((sqlResult:any) => {
              for (var i = 0; i < sqlResult.length; i++) {
                let data = sqlResult[i];
                if (asObject) {
                  result.push(this.createFromData(data));
                } else {
                  result.push(data);
                }
              }
              callback(result);
            });
          } catch (error) {
            console.log("SQL GENERAL ERROR - ", error);
          }
        }
      }

      createFromDoc(doc: firebase.firestore.DocumentSnapshot): this {
        var object:this = this.getModel(this.getModelType());
        var data = doc.data();
        var pathParams = this.getPathListParams();

        for (let key in pathParams) {
          let value = pathParams[key];
          object[key] = value;
        }

        for (let key in data) {
          let value = data[key];
          object[key] = value;
        }
        return object;
      }

      createFromData(data: Object): this {
        var object:this = this.getModel(this.getModelType());
        var pathParams = this.getPathListParams();

        for (let key in pathParams) {
          let value = pathParams[key];
          object[key] = value;
        }

        for (let key in data) {
          let value = data[key];
          object[key] = value;
        }
        return object;
      }

      initFromDoc(doc: firebase.firestore.DocumentSnapshot) {
        var data = doc.data();
        for (let key in data) {
          let value = data[key];
          this[key] = value;
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
      onList(callback: CallableFunction) {
        var that = this;
        this.getQuery().on(callback);
      }

      async save(): Promise<this> {
        if(!this.verifyRequiredFields()){
          return this;
        }
        if (this.getRepository()) {
          this.getRepository().save(this);
        } else {
          console.error("No repository!");
        } 
        return this;
      }

      getReferencePath(): string {
        return this.referencePath;
      }

      getRequiredFields(): Array<string> {
        return this.getModelType().requiredFields;
      }
      
      verifyRequiredFields(): boolean {
        var fields = this.getRequiredFields();
        var result = true;
        for(var i = 0; fields.length> i;i++){
            if(this[fields[i]] == null || typeof this[fields[i]] == undefined){
              result = false;
              console.error("Can't save " + fields[i] + " with null!");
            }
        }
        return result;
      }

      getDocumentData(): Object {
        return this.documentData;
      }

      getPathList(): Array<{ type: string; value: string }> | boolean {
        var that: any = this;
        var result = [];
        var path = this.getReferencePath();
        var newTxt = path.split("/");
        for (var x = 0; x < newTxt.length; x++) {
          var subPath = newTxt[x];
          if (subPath.search(":") != -1) {
            subPath = subPath.replace(":", "");
            if (!that[subPath]) {
              console.error(subPath + " is missing!");
              return false;
            } else {
              result.push({
                type: "document",
                value: that[subPath]
              });
            }
          } else {
            result.push({
              type: "collection",
              value: subPath
            });
          }
        }
        return result;
      }

      getPathListParams(): any {
        var that: any = this;
        var result:any= {};
        var keys = this.getPathListKeys();
        for(var i = 0; i < keys.length;i++){
          var subPath = keys[i];
          if (!that[subPath]) {
            console.error(subPath + " is missing!");
            return false;
          } else {
            result[subPath] = that[subPath];
          }
        } 
        return result;
      }

      
      getPathListKeys(): Array<string>{
        var that: any = this;
        var result = [];
        var path = this.getReferencePath();
        var newTxt = path.split("/");
        for (var x = 0; x < newTxt.length; x++) {
          var subPath = newTxt[x];
          if (subPath.search(":") != -1) {
            subPath = subPath.replace(":", "");
            result.push(subPath);
          }
        }
        return result;
      }
    };
  };
}
