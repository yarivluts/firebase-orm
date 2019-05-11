import * as firebase from "firebase/app";
import 'firebase/firestore';
import { BaseModel } from "./base.model";
import { ModelInterface } from "./interfaces/model.interface";
import { FireSQL } from "@arbel/firesql";
 
export class FirestoreOrmRepository{

    static globalFirestores = {};
    static globalPaths = {};
    static documentsRequiredFields = {};
    static DEFAULT_KEY_NAME = 'default';

    constructor(protected firestore : firebase.firestore.Firestore){

    }

    static initGlobalConnection(firestore : firebase.firestore.Firestore,key:string = FirestoreOrmRepository.DEFAULT_KEY_NAME){
        this.globalFirestores[key] = new FirestoreOrmRepository(firestore);
    }

    static getGlobalConnection(key : string = FirestoreOrmRepository.DEFAULT_KEY_NAME){
        if(this.globalFirestores[key]){
            return this.globalFirestores[key];
        }else{
            throw "the global firestore "+key+' is undefined!';
        }
    }

    
    static initGlobalPath(pathIdKey : string,pathIdValue : string){
        this.globalPaths[pathIdKey] = pathIdValue;
    }

    static getGlobalPath(pathIdKey : string){
        if(this.globalPaths[pathIdKey] && this.globalPaths[pathIdKey].trim() !== ''){
            return this.globalPaths[pathIdKey];
        }else{
            return null;
        }
    }

    getCollectionReferenceByModel(object : any){
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

    getFirestore() : firebase.firestore.Firestore{
        return this.firestore;
    }
    
    getModel<T>(model:{new(): T; }) : T & ModelInterface {
        var m : any | T = model;
        var object:any = new m(); 
        object.setRepository(this);
        object.setModelType(model);
        object.currentModel = object;
        //object.initFields();

        return <T & ModelInterface>object;
    }
    
    async sql(sql: string) : Promise<Array<Object>> {
        const fireSQL = new FireSQL(this.firestore);
        try {
           return await fireSQL.query(sql,{ includeId: 'id'});
        } catch (error) {
            console.error('SQL GENERAL ERROR - ',error);
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
           res.subscribe((results:any) => {
            callback(results);
           })
        } catch (error) {
            console.error('SQL GENERAL ERROR - ',error);
        }
    }
     
    /**
     * Load model object by id
     * @param object - class
     * @param id -string id
     * @param params - path params
     * @return model object
     */
    async load(object : any,id : string,params :{ [key:string]:string;} = {} ) : Promise<ModelInterface>{
            for(let key in params){
                let value = params[key];
                object[key] = value;
            }
        var ref = this.getCollectionReferenceByModel(object);
        if(!ref){
            console.error("Can't load the model " + object.getReferencePath() + " , please set all values");
            return object;
        } else{
            if(!id){
                console.error("Can't load the model " + object.getReferencePath() + " , please set id");
            }else{
                var doc = await ref.doc(id).get();
                if(!doc.exists){
                    object.is_exist = false;
                    return object;
                }else{
                    object.is_exist = true;
                    for(let key in  doc.data()){
                        let value =  doc.data()[key];
                        if(object.aliasFieldsMapper[key]){
                            object[object.aliasFieldsMapper[key]] = value;
                        }else{
                            object[key] = value;
                        }
                        
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
           console.error("Can't save the model " + object.getReferencePath() + " , please set all values");
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