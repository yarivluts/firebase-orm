import * as firebase from "firebase";
import { FirestoreOrmRepository } from "../repository";
import { Query,LIST_EVENTS } from "../query";
import {Moment} from 'moment';
import { ModelAllListOptions } from "./model.alllist.options.interface";
import { BaseModel } from "../base.model";

/**
 * Firestore Orm
 * Model interface 
 */
export interface ModelInterface {
  
  /**
   * Get Id
   * @return string
   */
  getId(): string;

  /**
   * Set Id
   * @param id string
   */
  setId(id: string): this;

  
  /**
   * Check if object exist inside the db
   */
  isExist(): boolean;

  /**
   * Verfiy required fields 
   * @return boolean
   */
  verifyRequiredFields() : boolean;

  
  /**
   * Get Id
   * @return string
   */
  getCreatedAt(): Moment | null;
  
  /**
   * Get Id
   * @return string
   */
  getUpdatedAt(): Moment | null;

  
  /**
   * Get Id
   * @return string
   */
  getId(): string;

  /**
   * Get current model
   */
  getCurrentModel() : this;


  /**
   * Load model by id
   * @param id - string
   * @param params - path paremeters
   */
  load(
    id: string,
    params?: { [key: string]: string }
  ): Promise<this>;
  
  /**
   * Init new model by id
   * @param id - string
   * @param params - path paremeters
   */
  init(
    id: string,
    params?: { [key: string]: string }
  ): Promise<this | null>;

  /**
   * Set document data directly
   * @param key 
   * @param value 
   */
  setParam(key : string,value : any) : this;
  
  /**
   * Set document data directly
   * @param key 
   * @param value 
   */
  getParam(key : string,defaultValue : any) : any;

  /**
   * Remove the current doc
   */
  remove() : Promise<boolean>;

  /**
   * Object real time changes listener
   * @param callback 
   */
  on(callback: CallableFunction,eventType? : LIST_EVENTS): CallableFunction; 
    
  /**
   * Get relation one
   * @param model 
   */
  getOneRel<T>(model: { new (): T }): Promise<T & BaseModel> ;

  /**
   * Get relation many
   * @param model 
   */
  getManyRel<T>(model: { new (): T }): Promise<Array<T & BaseModel>>;
 
  /**
   * Init the current model by firestore object
   * @param doc 
   * @return Current model
   */
  initFromDoc(doc: firebase.firestore.DocumentSnapshot): this;

  /**
   * Get document data from the current model
   * @return document data - Object
   */
  getDocumentData(): Object;
  
  /**
   * Get model collection reference path
   * @return reference path - string
   */
  getReferencePath(): string;

  /**
   * Get model collection reference
   * @return reference path - CollectionReference
   */
  getReference(): firebase.firestore.CollectionReference;

  /**
   * Get model document reference
   * @return reference path - CollectionReference
   */
  getDocReference(): firebase.firestore.DocumentReference

  /**
   * Get path list params
   * @return path list params - Object
   */
  getPathListParams(): { [key: string]: string };

  /**
   * Factory method of model object
   * @param model - The class reference
   * @return initialize model object
   */
  getModel<T>(model: { new (): T }): T & BaseModel;

  /**
   * Get required fields
   * @return fields array 
   */
  getRequiredFields(): Array<string>;
  
  /**
   * Get data in json string
   * @return string
   */
  toString(): string;
  
  /**
   * load from string
   * @return this
   */
  loadFromString(jsonString : string): this;
  
  /**
   * Init object from string
   * @return new model
   */
  initFromString(jsonString : string): this;

  /**
   * Get path list
   * @return path list array or false
   */
  getPathList(): Array<{ type: string; value: string }> | boolean;

  /**
   * Get firestore orm repository
   * @return FirestoreOrmRepository
   */
  getRepository(): FirestoreOrmRepository;
  
  /**
   * Set firestore orm repository
   * @param FirestoreOrmRepository
   * @return Model object
   */
  setRepository(repository: FirestoreOrmRepository): this;

  /**
   * Save action
   * Store the document data inside firestore
   */
  save(): Promise<this>;
}
