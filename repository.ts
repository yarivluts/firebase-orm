import * as firebase from "firebase";
import { ModelAbstract } from "./abstract";
import { ModelInterface } from "./interfaces/model.interface";
import { FireSQL } from "firesql";
import 'firesql/rx'; 

export class FirestoreOrmRepository{

    static documentsRequiredFields = {};

    constructor(protected firestore : firebase.firestore.Firestore){

    }

    getCollectionReferenceByModel(object : ModelInterface){
        var current:any = this.firestore;
        var pathList:any = object.getPathList();
        if(!pathList || pathList.length < 1){
            return false;
        }
        for(var i = 0;i < pathList.length;i++){
            var stage = pathList[i];
            if(stage.type == 'collection'){
                current = current.collection(stage.value);
            }else if(stage.type == 'document'){
                current = current.doc(stage.value);
            }
        }
        return current;
    }
    
    getModel<T>(model:{new(): T; }) : T & ModelInterface {
        var m : any | T = model;
        var object:any = new m(); 
        object.setRepository(this);
        object.setModelType(model);
        return <T & ModelInterface>object;
    }
    
    async sql(sql: string) : Promise<Array<Object>> {
        const fireSQL = new FireSQL(this.firestore);
        try {
           return await fireSQL.query(sql,{ includeId: 'id'});
        } catch (error) {
            console.log('SQL GENERAL ERROR - ',error);
            return [];
        }
    }
 
    /**
     * Listen to sql query result 
     * @param sql - sql query 
     * @param callback - running callback
     */
    onSql(sql: string,callback : CallableFunction) : void {
        const fireSQL = new FireSQL(this.firestore);
        try {
           const res = fireSQL.rxQuery(sql,{ includeId: 'id'});
           res.subscribe(results => {
            callback(results);
           })
        } catch (error) {
            console.log('SQL GENERAL ERROR - ',error);
        }
    }
     
    /**
     * Load model object by id
     * @param object - class
     * @param id -string id
     * @param params - path params
     * @return model object
     */
    async load(object : any,id : string,params :{ [key:string]:string;} = {} ) : Promise<ModelInterface | null>{
            for(let key in params){
                let value = params[key];
                object[key] = value;
            }
        var ref = this.getCollectionReferenceByModel(object);
        if(!ref){
            console.error("Can't load the model, please set all values");
            return null;
        } else{
            if(!id){
                console.error("Can't load the model, please set id");
            }else{
                var doc = await ref.doc(id).get();
                if(!doc.exists){
                    console.log(doc.exists,doc.data());
                    return null;
                }else{
                    console.log(doc.exists,doc.data());
                    for(let key in  doc.data()){
                        let value =  doc.data()[key];
                        object[key] = value;
                    }
                    return object;
                }
            }
        }
        
        return object;
    }
  
    /**
     * Save the model object
     * @param model 
     */
    async save(model : any ){
        var object : ModelInterface = model;
       var ref = this.getCollectionReferenceByModel(object);
       if(!ref){
           console.error("Can't save the model, please set all values");
           return false;
       } 
       if(object.getId()){
        var docRef = await ref.doc(object.getId()).set(object.getDocumentData());
       }else{
           try {
           var docRef = await ref.add(object.getDocumentData());
           object.setId(docRef.id);
           } catch (error) {
            console.error("Error adding document: ", error);
           }
        
       }
       return object;
    }
} 