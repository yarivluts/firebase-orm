import * as firebase from "firebase";
import { FirestoreOrmRepository } from "../repository";
import { Query } from "../query";

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
   * Set the model type
   * @param model - Model class
   */
  setModelType(model: any): this;

  /**
   * Verfiy required fields 
   * @return boolean
   */
  verifyRequiredFields() : boolean;
  /**
   * Get model type
   * @return - Model class type
   */
  getModelType(): any;

  /**
   * Load model by id
   * @param id - string
   * @param params - path paremeters
   */
  load(
    id: string,
    params?: { [key: string]: string }
  ): Promise<ModelInterface | null>;

  /**
   * Creates and returns a new Query with the additional filter that documents
   * must contain the specified field and the value should satisfy the
   * relation constraint provided.
   *
   * @param fieldPath The path to compare
   * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
   * @param value The value for comparison
   * @return Orm Query
   */
  where(
    fieldPath: string,
    opStr: firebase.firestore.WhereFilterOp,
    value: any
  ): Query;

  /**
   * Get Orm Query
   * @return Query
   */
  getQuery(): Query;

  /**
   * Object real time changes listener
   * @param callback 
   */
  on(callback: CallableFunction): void;
  
  /**
   * List real time listener
   * @param callback 
   */
  onList(callback: CallableFunction): void;

  /**
   * Get relation one
   * @param model 
   */
  getOneRel<T>(model: { new (): T }): Promise<T & ModelInterface>;

  /**
   * Get relation many
   * @param model 
   */
  getManyRel<T>(model: { new (): T }): Promise<Array<T & ModelInterface>>;

  /**
   * Run sql query on model collection
   * @param sql 
   * @param asObject 
   * @return Current model array
   */
  sql(sql: string, asObject?: boolean): Promise<Array<this>>;

  /**
   * Run sql query on model collection in real time updates
   * @param sql 
   * @param asObject 
   */
  onSql(sql: string, asObject?: boolean): void;

  /**
   * Create model from firestore doc object
   * @param doc 
   * @return Current model
   */
  createFromDoc(doc: firebase.firestore.DocumentReference): this;

  /**
   * Init the current model by firestore object
   * @param doc 
   * @return Current model
   */
  initFromDoc(doc: firebase.firestore.DocumentReference): this;

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
   * Get path list params
   * @return path list params - Object
   */
  getPathListParams(): { [key: string]: string };

  /**
   * Factory method of model object
   * @param model - The class reference
   * @return initialize model object
   */
  getModel<T>(model: { new (): T }): T & ModelInterface;

  /**
   * Get required fields
   * @return fields array 
   */
  getRequiredFields(): Array<string>;

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
