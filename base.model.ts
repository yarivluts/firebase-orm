/**
 * @jest-environment node
 */


import { ModelInterface } from "./interfaces/model.interface";
import { FirestoreOrmRepository } from "./repository";
import { Query, LIST_EVENTS } from "./query";
import type { Moment } from "moment";
import { StorageReference } from "./interfaces/storage.file.reference.interface";
import { ElasticWhereSqlResponse } from "./interfaces/elastic.where.sql.response.interface";
import { ElasticSqlResponse } from "./interfaces/elastic.sql.response.interface";
import { ModelAllListOptions } from './interfaces/model.alllist.options.interface';
import { printLog } from './utils';
let axios: typeof import('axios').default;

function lazyLoadAxios() {
  return new Promise((resolve) => {
    if (axios) {
      resolve(axios);
    } else {
      import('axios').then((axiosModule) => {
        axios = axiosModule.default;
        resolve(axios);
      });
    }
  });
}

import * as qs from 'qs';

import type { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, FieldPath, OrderByDirection, Timestamp, WhereFilterOp } from 'firebase/firestore';

/**
 * Check if we're using Admin SDK
 */
function isAdminFirestore(firestore: any): boolean {
    return typeof firestore.collection === 'function' && 
           typeof firestore.doc === 'function' &&
           (firestore._settings !== undefined || firestore.toJSON !== undefined);
}

async function deleteDocument(path: any): Promise<void> {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    
    if (isAdminFirestore(firestore)) {
        // Admin SDK - path is already a DocumentReference with delete method
        await path.delete();
    } else {
        // Client SDK - use deleteDoc function
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(path);
    }
}

async function getDocument(path: any): Promise<DocumentSnapshot<DocumentData>> {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    
    if (isAdminFirestore(firestore)) {
        // Admin SDK - path is already a DocumentReference with get method
        if (typeof path === 'string') {
            const docRef = (firestore as any).doc(path);
            return await docRef.get();
        }
        return await path.get();
    } else {
        // Client SDK - use getDoc function
        const { getDoc, doc } = await import('firebase/firestore');
        // Convert path to ref if it is a string
        if (typeof path === 'string') {
            path = doc(firestore as any, path);
        }
        return await getDoc(path);
    }
}

async function onDocumentSnapshot(path: any, callback: (snapshot: DocumentSnapshot<DocumentData>) => void): Promise<() => void> {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    
    if (isAdminFirestore(firestore)) {
        // Admin SDK - path is already a DocumentReference with onSnapshot method
        return path.onSnapshot(callback);
    } else {
        // Client SDK - use onSnapshot function
        const { onSnapshot } = await import('firebase/firestore');
        return onSnapshot(path, callback);
    }
}

import type { StringFormat, UploadMetadata, UploadTask } from 'firebase/storage';
let getDownloadURL: any;
let ref: any;

function lazyLoadFirebaseStorage() {
  return new Promise((resolve) => {
    if (getDownloadURL && ref) {
      resolve({ getDownloadURL, ref });
    } else {

      import('firebase/storage').then((firebaseStorage) => {
        getDownloadURL = firebaseStorage.getDownloadURL;
        ref = firebaseStorage.ref;
        resolve({ getDownloadURL, ref });
      });
    }
  });
}


// Declare global and window for cross-environment compatibility
declare const global: any;
declare const window: any;
declare const Buffer: any;

let globalVar = (typeof global !== 'undefined' ? global : window) as any;
if (typeof atob === 'undefined') {

  import('atob').then((atob) => {
    globalVar.atob = atob;
  });
}
if (typeof btoa === 'undefined') {

  import('btoa').then((btoa) => {
    globalVar.btoa = btoa;
  });
}

if (typeof XMLHttpRequest === 'undefined') {
  // Polyfills required for Firebase
  var XMLHttpRequest: any;
  // @ts-ignore
  import('xhr2').then((XMLHttpRequest) => {
    globalVar.XMLHttpRequest = XMLHttpRequest;
    import('ws').then((WebSocket) => {
      globalVar.WebSocket = WebSocket;
    });
  });
}




let moment: any;

function getMoment() {
  return new Promise((resolve) => {
    if (moment) {
      resolve(moment);
    } else {
      /* import('moment').then((moment_) => {
        moment = moment_['default'] ?? moment_;
        resolve(moment);
      }); */
    }
  });
}

/**
 * Represents a base model for Firebase ORM.
 */
export class BaseModel implements ModelInterface {

  /**
   * The flag for the created_at field.
   */
  protected static CREATED_AT_FLAG: string = "created_at";

  /**
   * The flag for the updated_at field.
   */
  protected static UPDATED_AT_FLAG: string = "updated_at";

  /**
   * The ID of the model.
   */
  id!: string;

  //referencePath!: string;
  protected _referencePath!: string;
  protected isAutoTime!: boolean;
  created_at!: any;
  updated_at!: any;
  protected unlistenFunc!: any;
  protected is_exist: boolean = false;
  protected currentModel!: this & BaseModel;
  protected static aliasFieldsMapper: any = {};
  protected static reverseAliasFieldsMapper: any = {};
  protected static textIndexingFields: any = {};
  protected static ignoreFields: any = [];
  protected static fields: any = {};
  protected static requiredFields: Array<string> = [];
  protected static internalFields: Array<string> = [];
  protected repository!: FirestoreOrmRepository;
  protected globalModel!: this;
  protected currentQuery!: any;
  protected data: any = {};
  protected currentQueryListener!: any;
  protected modelType!: any;
  protected pathParams: Map<string, any> = new Map();
  protected _createdViaGetModel: boolean = false;

  constructor() {
    getMoment();
    var connectionName = FirestoreOrmRepository.DEFAULT_KEY_NAME;
    if (this['connectionName']) {
      connectionName = this['connectionName'];
    }
    this.repository = FirestoreOrmRepository.getGlobalConnection(connectionName);
    this.initProp();
  }

  /**
   * Initializes the properties of the model.
   */
  initProp() {
    if (!this['storedFields']) {
      this['storedFields'] = [];
    }
    if (!this['fields']) {
      this['fields'] = {};
    }
    if (!this['requiredFields']) {
      this['requiredFields'] = [];
    }
    if (!this['aliasFieldsMapper']) {
      this['aliasFieldsMapper'] = [];
    }
  }

  /**
   * Sets path parameters for the model.
   * Manages the pathParams map property that will be used in getPathList, etc.
   * @param key - The parameter key
   * @param value - The parameter value
   * @returns The updated model instance
   */
  setPathParams(key: string, value: any): this {
    this.pathParams.set(key, value);
    return this;
  }

  /**
   * Checks if instance query methods are allowed on this model.
   * Instance query methods should only be called on models created via getModel().
   * @throws Error if instance query methods are not allowed
   */
  protected checkInstanceQueryAllowed(): void {
    if (!this._createdViaGetModel) {
      throw new Error(
        'Instance query methods (getAll, where, query, find, findOne) can only be called on models retrieved via getModel(). ' +
        'Use static methods like Model.getAll() or retrieve the model through a parent: parentModel.getModel(ChildModel).getAll()'
      );
    }
  }

  /**
   * Gets the current path parameters map.
   * @returns The pathParams Map
   */
  getPathParams(): Map<string, any> {
    return this.pathParams;
  }

  /**
   * Static method to initialize a model with path parameters.
   * Provides a convenient way to set multiple path parameters at once.
   * 
   * @template T - The type of the model
   * @param params - An object containing key-value pairs for path parameters
   * @returns A new instance of the model with path parameters set
   * 
   * @example
   * // Simple usage with getAll()
   * const questions = await Question.initPathParams({
   *   'course_id': courseId,
   *   'lesson_id': lessonId
   * }).getAll();
   * 
   * @example
   * // Chaining with where clause
   * const activeQuestions = await Question.initPathParams({
   *   'course_id': courseId,
   *   'lesson_id': lessonId
   * }).where('status', '==', 'active').get();
   * 
   * @example
   * // Using query builder
   * const query = Question.initPathParams({
   *   'course_id': courseId,
   *   'lesson_id': lessonId
   * }).query().where('difficulty', '>', 3).limit(10);
   */
  static initPathParams<T>(this: { new(): T }, params: { [key: string]: any }): T & BaseModel {
    const instance = new this() as T & BaseModel;
    
    // Set the model type so instance methods work correctly
    instance.setModelType(this);
    
    // Set all path parameters from the params object
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        instance.setPathParams(key, params[key]);
      }
    }
    
    return instance;
  }

  /**
   * Parses the text indexing fields.
   * @param text - The text to parse.
   * @returns An array of parsed text indexing fields.
   */
  parseTextIndexingFields(text: string) {
    var map = {};
    text = (text + '').toLowerCase();
    var edgeSymbol = '~~~';
    var result = [edgeSymbol + text + edgeSymbol, text];
    for (var i = 0; text.length > i; i++) {
      for (var x = 1; x < text.length; x++) {
        var subString = text.substr(i, text.length - x);
        map[subString] = true;
        if (i == 0) {
          subString = edgeSymbol + subString;
          map[subString] = true;
        } else if (i + 1 == text.length) {
          subString = subString + edgeSymbol;
        }
      }
    }
    for (var option in map) {
      result.push(option);
    }
    return result;
  }

  /**
   * Refreshes text indexing for all fields marked with is_text_indexing.
   * This method recreates the text index for fields that have values but missing text indices.
   */
  refreshTextIndexing(): void {
    const modelPrototype = Object.getPrototypeOf(this);

    // Get text indexing fields from the prototype
    if (modelPrototype && modelPrototype.textIndexingFields) {
      for (const fieldKey in modelPrototype.textIndexingFields) {
        if (modelPrototype.textIndexingFields.hasOwnProperty(fieldKey)) {
          const fieldName = this.getFieldName(fieldKey);
          const textIndexFieldName = 'text_index_' + fieldName;
          
          // Get field value from multiple sources
          let fieldValue = this.data[fieldName];
          if (!fieldValue && typeof this[fieldKey] !== 'undefined') {
            fieldValue = this[fieldKey];
          }
          if (!fieldValue && typeof this[this.getAliasName(fieldName)] !== 'undefined') {
            fieldValue = this[this.getAliasName(fieldName)];
          }

          // If field has value but text index is missing or empty, recreate it
          if (fieldValue && (!this.data[textIndexFieldName] || !Array.isArray(this.data[textIndexFieldName]))) {
            this.data[textIndexFieldName] = this.parseTextIndexingFields(fieldValue + '');
          }
        }
      }
    }
  }

  /**
   * Gets the ID of the object.
   * @returns The ID of the object.
   */
  getId() {
    return this.id;
  }

  /**
   * Initializes the fields of the model.
   */
  initFields(): void { }

  /**
   * Checks if the model exists.
   * @returns True if the model exists, false otherwise.
   */
  isExist(): boolean {
    return this.is_exist;
  }

  /**
   * Gets one relation (legacy method - use loadBelongsTo instead).
   * @param model - The model to get the relation from.
   * @returns A promise that resolves to the related model.
   */
  async getOneRel<T>(model: { new(): T }): Promise<T & BaseModel> {
    var object: any = this.getModel(model);
    var that: any = this;
    return await object.load(that[object['pathId']]);
  }

  /**
   * Gets many relations (legacy method - use loadHasMany instead).
   * For backward compatibility, this method assumes the target model 
   * has a foreign key field that matches this model's pathId.
   * @param model - The model to get the relations from.
   * @returns A promise that resolves to an array of related models.
   */
  async getManyRel<T>(model: { new(): T }): Promise<Array<T & BaseModel>> {
    var object: any = this.getModel(model);
    var that: any = this;
    // Fixed logic: look for records where the foreign key equals this model's ID
    return await object
      .where(that.pathId, "==", that.getId())
      .get();
  }

  /**
   * Load a belongsTo relationship
   * @param relationshipName - The name of the relationship property
   */
  async loadBelongsTo<T>(relationshipName: string): Promise<T & BaseModel> {
    const relationships = (this as any).relationships;
    if (!relationships || !relationships[relationshipName]) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }

    const relationship = relationships[relationshipName];
    if (relationship.type !== 'belongsTo') {
      throw new Error(`Relationship '${relationshipName}' is not a belongsTo relationship`);
    }

    const localValue = (this as any)[relationship.localKey];
    if (!localValue) {
      throw new Error(`Local key '${relationship.localKey}' has no value`);
    }

    const relatedModel = this.getModel(relationship.model);
    return (await relatedModel.load(localValue)) as T & BaseModel;
  }

  /**
   * Load a hasOne relationship  
   * @param relationshipName - The name of the relationship property
   */
  async loadHasOne<T>(relationshipName: string): Promise<T & BaseModel> {
    const relationships = (this as any).relationships;
    if (!relationships || !relationships[relationshipName]) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }

    const relationship = relationships[relationshipName];
    if (relationship.type !== 'hasOne') {
      throw new Error(`Relationship '${relationshipName}' is not a hasOne relationship`);
    }

    const relatedModel = this.getModel(relationship.model);
    const results = await (relatedModel as any)
      .where(relationship.foreignKey, "==", this.getId())
      .get();

    if (results.length === 0) {
      throw new Error(`No related record found for hasOne relationship '${relationshipName}'`);
    }

    return results[0] as T & BaseModel;
  }

  /**
   * Load a hasMany relationship
   * @param relationshipName - The name of the relationship property
   */
  async loadHasMany<T>(relationshipName: string): Promise<Array<T & BaseModel>> {
    const relationships = (this as any).relationships;
    if (!relationships || !relationships[relationshipName]) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }

    const relationship = relationships[relationshipName];
    if (relationship.type !== 'hasMany') {
      throw new Error(`Relationship '${relationshipName}' is not a hasMany relationship`);
    }

    const relatedModel = this.getModel(relationship.model);
    return (await (relatedModel as any)
      .where(relationship.foreignKey, "==", this.getId())
      .get()) as Array<T & BaseModel>;
  }

  /**
   * Load a belongsToMany relationship
   * @param relationshipName - The name of the relationship property
   */
  async loadBelongsToMany<T>(relationshipName: string): Promise<Array<T & BaseModel>> {
    const relationships = (this as any).relationships;
    if (!relationships || !relationships[relationshipName]) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }

    const relationship = relationships[relationshipName];
    if (relationship.type !== 'belongsToMany') {
      throw new Error(`Relationship '${relationshipName}' is not a belongsToMany relationship`);
    }

    // Get junction table records
    const junctionModel = this.getModel(relationship.through);
    const junctionRecords = await (junctionModel as any)
      .where(relationship.thisKey, "==", this.getId())
      .get();

    // Get the related model IDs
    const relatedIds = junctionRecords.map((record: any) => record[relationship.otherKey]);
    
    // Load all related models
    const relatedModel = this.getModel(relationship.model);
    const results: Array<T & BaseModel> = [];
    
    for (const id of relatedIds) {
      const related = this.getModel(relationship.model);
      await related.load(id);
      results.push(related as T & BaseModel);
    }

    return results;
  }

  /**
   * Load all defined relationships or specific ones
   */
  async loadWithRelationships(relationshipNames?: string[]): Promise<this> {
    const relationships = (this as any).relationships;
    if (!relationships) {
      return this;
    }

    const names = relationshipNames || Object.keys(relationships);
    
    for (const name of names) {
      const relationship = relationships[name];
      try {
        switch (relationship.type) {
          case 'belongsTo':
            (this as any)[name] = await this.loadBelongsTo(name);
            break;
          case 'hasOne':
            (this as any)[name] = await this.loadHasOne(name);
            break;
          case 'hasMany':
            (this as any)[name] = await this.loadHasMany(name);
            break;
          case 'belongsToMany':
            (this as any)[name] = await this.loadBelongsToMany(name);
            break;
        }
      } catch (error) {
        console.warn(`Failed to load relationship '${name}':`, error);
      }
    }

    return this;
  }

  /**
   * Gets the model instance.
   * @param model - The model to get the instance of.
   * @returns The model instance.
   */
  getModel<T>(model: { new(): T }): T & BaseModel {
    var object: any = this.getRepository().getModel(model);
    var keys = object.getPathListKeys();
    var that: any = this;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (that.pathParams.has(key)) {
        object[key] = that.pathParams.get(key);
      } else if (that[key]) {
        object[key] = that[key];
      } else if (key == that.pathId && that.getId()) {
        object[key] = that.getId();
      }
    }
    // Mark this instance as created via getModel
    object._createdViaGetModel = true;
    return object;
  }

  /**
   * Gets the current model instance.
   * @returns The current model instance.
   */
  getCurrentModel(): this {
    var object: any = this.getRepository().getModel(this.getModelType());
    var keys = object.getPathListKeys();
    var that: any = this;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (that.pathParams.has(key)) {
        object[key] = that.pathParams.get(key);
      } else if (that[key]) {
        object[key] = that[key];
      } else if (key == that.pathId && that.getId()) {
        object[key] = that.getId();
      }
    }
    // Preserve the _createdViaGetModel flag when getting current model
    object._createdViaGetModel = this._createdViaGetModel;
    return object;
  }

  /**
   * Converts the model to a string.
   * @returns The model as a string.
   */
  toString(): string {
    var res: any = Object.assign({}, this.getDocumentData());
    if (this.getId()) {
      res.id = this.getId();
    }
    return JSON.stringify(res);
  }

  /**
   * Loads the model from a string.
   * @param jsonString - The string representation of the model.
   * @returns The loaded model.
   */
  loadFromString(jsonString: string): this {
    var model: any = this;
    var params = JSON.parse(jsonString);
    this.createFromData(params, model);
    return model;
  }

  /**
   * Initializes the object from a string.
   * @param jsonString - The string representation of the model.
   * @returns The initialized model.
   */
  initFromString(jsonString: string): this {
    var model: any = this.getCurrentModel();
    var params = JSON.parse(jsonString);
    this.createFromData(params, model);
    return model;
  }

  /**
   * Gets the repository reference for the model.
   * @returns The repository reference.
   */
  getRepositoryReference(): DocumentReference<DocumentData> | CollectionReference<DocumentData> | null {
    try {
      return this.getRepository().getCollectionReferenceByModel(this);
    } catch (error) {
      console.warn('Repository reference not available, setup may not be complete:', error.message);
      return null;
    }
  }

  /**
   * Gets the repository reference for the model (async version).
   * @returns The repository reference.
   */
  async getRepositoryReferenceAsync(): Promise<DocumentReference<DocumentData> | CollectionReference<DocumentData> | null> {
    return await this.getRepository().getCollectionReferenceByModelAsync(this);
  }

  /**
   * Gets the document repository reference for the model.
   * @returns The document repository reference.
   */
  getDocRepositoryReference(): DocumentReference<DocumentData> | null {
    try {
      return this.getRepository().getDocReferenceByModel(this);
    } catch (error) {
      console.warn('Document repository reference not available, setup may not be complete:', error.message);
      return null;
    }
  }

  /**
   * Gets the document repository reference for the model (async version).
   * @returns The document repository reference.
   */
  async getDocRepositoryReferenceAsync(): Promise<DocumentReference<DocumentData> | null> {
    return await this.getRepository().getDocReferenceByModelAsync(this);
  }

  /**
   * Gets the document reference for the model.
   * @returns The document reference.
   */
  getDocReference(): DocumentReference<DocumentData> | null {
    return this.getDocRepositoryReference();
  }

  /**
   * Gets the document reference for the model (async version).
   * @returns The document reference.
   */
  async getDocReferenceAsync(): Promise<DocumentReference<DocumentData> | null> {
    return await this.getDocRepositoryReferenceAsync();
  }

  /**
   * Sets the model type.
   * @param model - The model type.
   * @returns The updated model instance.
   */
  setModelType(model: any): this {
    this.modelType = model;
    return this;
  }

  /**
   * Gets the model type.
   * @returns The model type.
   */
  getModelType() {
    return this.modelType;
  }

  /**
   * Creates a query with a where clause.
   * @param fieldPath - The field path to filter on.
   * @param opStr - The operator string.
   * @param value - The value to compare against.
   * @returns The query with the where clause.
   */
  static where<T>(
    this: { new(): T },
    fieldPath: string,
    opStr: WhereFilterOp,
    value: any
  ): Query<T> {
    var that: any = this;
    var query = that.query().where(fieldPath, opStr, value);
    return query;
  }

  /**
   * Creates a query with a where clause.
   * @param fieldPath - The field path to filter on.
   * @param opStr - The operator string.
   * @param value - The value to compare against.
   * @returns The query with the where clause.
   * @throws Error if called on a model not created via getModel()
   */
  where(
    fieldPath: string,
    opStr: WhereFilterOp,
    value: any
  ): Query<this> {
    this.checkInstanceQueryAllowed();
    var that: any = this;
    var query = that.query().where(fieldPath, opStr, value);
    return query;
  }

  /**
   * Gets one document from the current query.
   * @returns A promise that resolves to the document.
   */
  async getOne() {
    if (!this.currentQuery) {
      var that: any = this;
      this.currentQuery = this.getRepository().getCollectionReferenceByModel(
        that
      );
    }
    return await this.currentQuery.get();
  }

  /**
   * Sets the ID of the model.
   * @param id - The ID to set.
   * @returns The updated model instance.
   */
  setId(id: string) {
    this.id = id;
    return this;
  }

  /**
   * Loads the model with the specified ID.
   * @param id - The ID of the model to load.
   * @param params - Additional parameters for loading the model.
   * @returns A promise that resolves to the loaded model.
   */
  async load(
    id: string,
    params: { [key: string]: string } = {}
  ): Promise<this> {
    var that: any = this;
    if (that.observeLoadBefore) {
      that.observeLoadBefore();
    }
    var res: any = null;
    this.setId(id);
    if (this.getRepository()) {
      res = await this.getRepository().load(this, id, params);
    } else {
      console.error("No repository!");
    }
    if (res && res.observeLoadAfter) {
      res.observeLoadAfter();
    }
    return this;
  }

  /**
   * Initializes the model with the specified ID.
   * @param id - The ID of the model to initialize.
   * @param params - Additional parameters for initializing the model.
   * @returns A promise that resolves to the initialized model.
   */
  async init(
    id: string,
    params: { [key: string]: string } = {}
  ): Promise<this | null> {
    var object = this.getCurrentModel();
    var res: any;
    object.setId(id);
    if (object.getRepository()) {
      res = await this.getRepository().load(object, id, params);
    } else {
      console.error("No repository!");
    }
    return res;
  }

  /**
   * Initializes and loads the model with the specified ID.
   * Provides a simpler alternative to the `new Model(); await model.load(id)` pattern.
   * 
   * @example
   * // Load a simple model
   * const user = await User.init(userId);
   * if (user) {
   *   console.log(user.name);
   * }
   * 
   * // Load a nested model with path parameters
   * const member = await Member.init(memberId, { website_id: websiteId });
   * if (member) {
   *   console.log(member.name);
   * }
   * 
   * // For creating new instances, use the constructor
   * const newUser = new User();
   * newUser.name = "John";
   * await newUser.save();
   * 
   * @param id - The ID of the model to load. This parameter is required.
   * @param pathParams - Path parameters for nested collections (e.g., { website_id: 'abc123' }).
   * @returns A promise that resolves to the loaded model, or null if the model is not found.
   */
  static async init<T>(this: { new(): T },
    id: string,
    pathParams: { [key: string]: string } = {}
  ): Promise<(T & BaseModel) | null> {
    var object: BaseModel & T = (new this()) as BaseModel & T;
    
    // Set path parameters if provided
    for (const key in pathParams) {
      object.setPathParams(key, pathParams[key]);
    }
    
    // Load the model from the database
    object.setId(id as string);
    
    if (object.getRepository()) {
      var res: any = await object.getRepository().load(object, object.getId() as string, pathParams);
      // Return null if the model doesn't exist in the database
      if (res && !res.isExist()) {
        return null;
      }
      return res as (T & BaseModel);
    } else {
      console.error("No repository!");
      return null;
    }
  }

  /**
   * Removes the model from the database.
   * @returns A promise that resolves to true if the removal was successful, false otherwise.
   */
  async remove(): Promise<boolean> {
    try {
      var that: any = this;
      if (that.observeRemoveBefore) {
        that.observeRemoveBefore();
      }
      const ref = await this.getDocReferenceAsync();
      await deleteDocument(ref);
      if (that.observeRemoveAfter) {
        that.observeRemoveAfter();
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Creates a query for the model.
   * @returns The query for the model.
   */
  static query<T>(this: { new(): T }): Query<T> {
    var query = new Query<T>();
    var object: any = new this();
    object.setModelType(this);
    query.init(object, null);
    return query;
  }

  /**
   * Creates a collection query for the model.
   * @returns The collection query for the model.
   */
  static collectionQuery<T>(this: { new(): T }): Query<T> {
    const isCollectionGroup = true;
    var query = new Query<T>();
    var object: any = new this();
    object.setModelType(this);
    query.init(object, null, isCollectionGroup);
    return query;
  }

  /**
   * Creates a query for the model.
   * @returns The query for the model.
   * @throws Error if called on a model not created via getModel()
   */
  query(): Query<this> {
    this.checkInstanceQueryAllowed();
    var query = new Query<this>();
    var that: any = this;
    var object: any = that.getCurrentModel();
    query.init(object);
    return query;
  }

  /**
   * Gets the collection name for the model.
   * @returns The collection name.
   */
  getCollectionName(): string {
    var paths = this['referencePath'].split('/');
    return paths[paths.length - 1];
  }

  /**
   * Executes a full SQL query on Elasticsearch.
   * @param sql - The SQL query to execute.
   * @param limit - The maximum number of results to return.
   * @param filters - Additional filters to apply to the query.
   * @param cursor - The cursor for pagination.
   * @param columns - The columns to include in the result.
   * @param asObject - Whether to return the result as an object or not.
   * @returns A promise that resolves to the Elasticsearch SQL response.
   */
  static async elasticFullSql<T>(this: { new(): T },
    sql?: string,
    limit?: number,
    filters?: any,
    cursor?: any,
    columns?: any,
    asObject: boolean = true
  ): Promise<ElasticSqlResponse> {
    var object: any = new this();
    object.setModelType(this);
    var that: any = this;
    var result: any = {
      data: []
    };

    try {
      var connection = FirestoreOrmRepository.getGlobalElasticsearchConnection();
    } catch (error) {
      console.error(error);
      return result;
    }

    if (!connection || !connection.url) {
      console.error('Elasticsearch is not defined!');
      return result;
    }
    var params: any = {};

    if (sql) {
      params['query'] = sql;
    }
    if (limit) {
      params['fetch_size'] = limit;
    }
    if (filters) {
      params['filter'] = filters;
    }
    if (cursor) {
      params['cursor'] = cursor;
    }

    var time = (+ new Date()) + Math.random() * 100;
    try {
      await lazyLoadAxios();
      var response = await axios({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(params),
        url: connection.url + '/_sql'
      });
      var data = response.data;
      columns = columns ? columns : response.data.columns;
      var rows = response.data.rows;
      rows.forEach((row: any) => {
        var data: any = {};
        columns.forEach((column: any, index: any) => {
          data[column.name] = row[index];
        });
        if (asObject) {
          var newObject: any = new this();
          newObject.setModelType(this);
          //  printLog('data --- ',data);
          newObject.initFromData(data);
        } else {
          var newObject: any = data;
        }
        result.data.push(newObject);
      });
      //printLog(time,response.data);
      //printLog(time,params);

      // return result;
      if (response.data.cursor) {
        result.next = async function () {
          if (!this['_next']) {
            this['_next'] = await that.elasticFullSql(null, null, null, response.data.cursor, columns);
          }
          return this['_next'];
        }
      } else {
        //printLog('no cursor -------******************************** ')
      }

    } catch (error) {
      console.error(time, error);
    }

    //printLog(resultObject);
    return result;
  }

  /**
   * Escapes special characters in a string for SQL queries.
   * @param str - The string to escape.
   * @returns The escaped string.
   */
  escapeStringSql(str: string) {
    var string: any = str;
    string = string.split("'").join('');
    string = string.split('"').join('');
    return string.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char: string) {
      switch (char) {
        case "\0":
          return "\\0";
        case "\x08":
          return "\\b";
        case "\x09":
          return "\\t";
        case "\x1a":
          return "\\z";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\"":
        case "'":
        case "\\":
        case "%":
          return "\\" + char; // prepends a backslash to backslash, percent,
        // and double/single quotes
      }
    });
  }

  /**
   * Parses a value into a SQL string representation.
   * 
   * @param value - The value to be parsed.
   * @returns The SQL string representation of the value.
   */
  parseValueSql(value: any): string {
    var result = '';
    if (typeof value === 'number') {
      return value + '';
    }
    if (Object.prototype.toString.call(value) === '[object Array]') {
      value.forEach((val: string) => {
        if (result != '') {
          result += ',';
        }
        result += "'" + this.escapeStringSql(val + '') + "'";

      });
      return result;
    }
    return "'" + this.escapeStringSql(value + '') + "'";
  }



  /**
   * Executes an Elasticsearch SQL query.
   * 
   * @template T - The type of the model.
   * @param {string | any} whereSql - The SQL query or an array containing the query and its parameters.
   * @param {number} [limit] - The maximum number of results to return.
   * @param {any} [filters] - Additional filters to apply to the query.
   * @param {any} [cursor] - The cursor for pagination.
   * @param {any} [columns] - The columns to select in the query.
   * @param {boolean} [asObject=true] - Indicates whether to return the result as an object or an array.
   * @param {boolean} [asCount=false] - Indicates whether to return the count of the result.
   * @returns {Promise<ElasticWhereSqlResponse>} A promise that resolves to the result of the Elasticsearch SQL query.
   */
  static async elasticSql<T>(this: { new(): T },
    whereSql?: string | any,
    limit?: number,
    filters?: any,
    cursor?: any,
    columns?: any,
    asObject: boolean = true,
    asCount: boolean = false
  ): Promise<ElasticWhereSqlResponse> {
    var object: any = new this();
    var that: any = this;
    object.setModelType(this);
    var result: any = {
      data: []
    };

    if (whereSql && typeof whereSql !== 'string' &&
      Object.prototype.toString.call(whereSql) === '[object Array]' && whereSql.length == 2) {
      var query = whereSql[0];
      var params = whereSql[1];
      for (var key in params) {
        var search = ':' + key;
        var value = object.parseValueSql(params[key]);
        query = query.split(search).join(value);
      }
      whereSql = query;
      printLog('sql --- ', whereSql);
    }
    try {
      var connection = FirestoreOrmRepository.getGlobalElasticsearchConnection();
    } catch (error) {
      console.error(error);
      return result;
    }

    if (!connection || !connection.url) {
      console.error('Elasticsearch is not defined!');
      return result;
    }
    var params: any = {};
    var table = object.getReference().path.replace(new RegExp('/', 'g'), '_').toLowerCase();
    var hasSelect = (whereSql + '').toLowerCase().trim().startsWith('select ');

    var sql: any = '';
    if (hasSelect) {
      sql = whereSql;
    } else {
      sql = 'select * from ' + table + ' '
        + whereSql;
    }
    if (asCount) {
      sql = 'SELECT count(*) as count from ('
        + sql + ') as t';
    }

    if (sql) {
      params['query'] = sql;
    }
    if (limit) {
      params['fetch_size'] = limit;
    }
    if (filters) {
      params['filter'] = filters;
    }
    if (cursor) {
      params['cursor'] = cursor;
    }

    try {
      var result = await that.elasticFullSql(sql, limit, filters, null, null, !asCount && asObject);

      result.count = async function () {
        if (!this['_count']) {
          var res = await that.elasticSql(whereSql, null, filters, null, null, null, true);
          this['_count'] = res && res.data && res && res.data[0] && res.data[0].count ? res.data[0].count : 0;
        }
        return this['_count'];
      }

    } catch (error) {
      console.error(error);
    }
    //printLog(params);

    //printLog(resultObject);
    return result;
  }


  /**
   * Retrieves all documents of a specific model type from Firestore.
   * 
   * @template T - The type of the model.
   * @param {Array<any>} [whereArr] - An array of where conditions to filter the documents.
   * @param {{ fieldPath: string | FieldPath; directionStr?: OrderByDirection; }} [orderBy] - The field to order the documents by and the direction of the ordering.
   * @param {number} [limit] - The maximum number of documents to retrieve.
   * @param {{ [key: string]: string }} [params] - Additional parameters for the query.
   * @returns {Promise<Array<T>>} - A promise that resolves to an array of documents of the specified model type.
   */
  static async getAll<T>(this: { new(): T },
    whereArr?: Array<any>,
    orderBy?: {
      fieldPath: string | FieldPath;
      directionStr?: OrderByDirection;
    },
    limit?: number,
    params?: { [key: string]: string }
  ): Promise<Array<T>> {
    var object: any = new this();
    object.setModelType(this);
    var query: Query<any> = object.query();
    if (whereArr && whereArr[0] && whereArr[0].length == 3) {
      for (var i = 0; i < whereArr.length; i++) {
        query.where(whereArr[i][0], whereArr[i][1], whereArr[i][2]);
      }
    }
    if (limit) {
      query.limit(limit);
    }
    var res: any = await query.get();
    return res;
  }


  /**
   * Retrieves all the records from the database that match the specified conditions.
   * 
   * @param whereArr - An optional array of conditions to filter the records.
   * @param orderBy - An optional object specifying the field to order the records by and the direction of the ordering.
   * @param limit - An optional number specifying the maximum number of records to retrieve.
   * @param params - An optional object containing additional parameters for the query.
   * @returns A promise that resolves to an array of records.
   * @throws Error if called on a model not created via getModel()
   */
  async getAll(whereArr?: Array<any>,
    orderBy?: {
      fieldPath: string | FieldPath;
      directionStr?: OrderByDirection;
    },
    limit?: number,
    params?: { [key: string]: string }
  ): Promise<Array<this>> {
    this.checkInstanceQueryAllowed();
    var that: any = this.getModelType();
    var object: any = this.getCurrentModel();
    var query = object.query();
    if (whereArr && whereArr[0] && whereArr[0].length == 3) {
      for (var i = 0; i < whereArr.length; i++) {
        query.where(whereArr[i][0], whereArr[i][1], whereArr[i][2]);
      }
    }
    if (limit) {
      query.limit(limit);
    }
    var res: any = await query.get();
    return res;
  }


  /**
   * Returns the repository associated with this model.
   * @returns The repository instance.
   */
  getRepository() {
    return this.repository;
  }

  /**
   * Sets the repository for the model.
   * 
   * @param repository - The repository to set.
   * @returns The updated model instance.
   */
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
  on(callback: CallableFunction): CallableFunction {
    var that: any = this;
    var res = () => { };
    if (!that.getId()) {
      console.error(
        this['referencePath'] +
        "/:" +
        this['pathId'] +
        " - " +
        "The model not stored yet"
      );
      return res;
    } else if (!that.getReference()) {
      console.error(
        "The model path params is not set and can't run on() function "
      );
      return res;
    } else {
      return that
        .getReference()
        .doc(that.getId())
        .onSnapshot((documentSnapshot: any) => {
          var data = documentSnapshot.data();
          for (let key in data) {
            let value = data[key];
            that[key] = value;
          }
          callback(that);
        });
    }
  }

  /**
   * Listens for changes on the current object and invokes the provided callback function.
   * @param callback - The callback function to be invoked when the object changes.
   * @returns A function that can be used to stop listening for changes.
   */
  listen(callback?: CallableFunction) {
    this.unlistenFunc = this.on((newObject: this) => {
      this.copy(newObject);
      if (callback) {
        callback(this);
      }
    });
    return this.unlistenFunc;
  }

  /**
   * Stops listening for changes on the model.
   * @returns {any} The result of the unlisten function, or `false` if there is no unlisten function.
   */
  unlisten(): any {
    if (this.unlistenFunc) {
      var res = this.unlistenFunc();
      this.unlistenFunc = null;
      return res;
    }
    return false;
  }

  /**
   * Creates an instance of the current model from a Firestore DocumentSnapshot.
   * 
   * @param doc - The DocumentSnapshot containing the data.
   * @returns A Promise that resolves to an instance of the current model.
   */
  async createFromDoc(doc: DocumentSnapshot): Promise<this> {
    var object: any = this.getCurrentModel();
    var d: any = doc;
    var data = await doc.data();
    var pathParams = object.getPathListParams();

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


  /**
   * Creates an instance of the model from a Firestore DocumentSnapshot.
   * 
   * @template T - The type of the model.
   * @param {DocumentSnapshot} doc - The Firestore DocumentSnapshot.
   * @returns {Promise<T>} - A promise that resolves to the created model instance.
   */
  static async createFromDoc<T>(this: { new(): T }, doc: DocumentSnapshot): Promise<T> {
    var object: any = new this();
    object.setModelType(this);
    var d: any = doc;
    var data = await doc.data();
    var pathParams = object.getPathListParams();

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



  static async createFromDocRef<T>(this: { new(): T }, doc: DocumentReference): Promise<T | null> {
    var object: any = new this();
    object.setModelType(this);
    var d: any = doc;
    var data = (await getDocument(doc)).data();
    if (data) {
      var pathParams = object.getPathListParams();

      for (let key in pathParams) {
        let value = pathParams[key];
        object[key] = value;
      }

      for (let key in data) {
        let value = data[key];
        object[key] = value;
      }
      return object;
    } else {
      return null;
    }

  }


  async createFromDocRef<T>(this: { new(): T }, doc: DocumentReference): Promise<T | null> {
    var object: any = new this();
    object.setModelType(this);
    var d: any = doc;
    var data = (await getDocument(doc)).data();
    if (data) {
      var pathParams = object.getPathListParams();

      for (let key in pathParams) {
        let value = pathParams[key];
        object[key] = value;
      }

      for (let key in data) {
        let value = data[key];
        object[key] = value;
      }
      return object;
    } else {
      return null;
    }

  }

  createFromData(data: Object, targetObject?: this): this {
    var params: any = data;
    var object: any = !targetObject
      ? this.getCurrentModel()
      : targetObject;
    if (data['id']) {
      this.is_exist = true;
      this.setId(data['id']);
    }
    var pathParams = this.getPathListParams();
    for (let key in pathParams) {
      let value = pathParams[key];
      object[key] = value;
    }
    for (let key in params) {
      let value = params[key];
      if (object.aliasFieldsMapper && object.aliasFieldsMapper[key]) {
        object[object.aliasFieldsMapper[key]] = value;
      } else {
        if (object.getAliasName(key) !== key) {
          object[object.getAliasName(key)] = value;
          object.setParam(key, value)
        } else if (object.getOriginName(key)) {
          object[object.getOriginName(key)] = value;
        } else if (!(this['ignoredFields'] && this['ignoredFields'][key])) {
          object[key] = value;
        }

      }
    }
    return object;
  }

  getOriginName(key: string) {
    var that: any = this;
    for (var originKey in that.aliasFieldsMapper) {
      if (that.aliasFieldsMapper[originKey] == key) {
        return originKey;
      }
    }
    return null
  }

  initFromData(data: Object, targetObject?: this): this {
    return this.createFromData(data, this);
  }

  initFromDoc(doc: DocumentSnapshot) {
    var that: any = this;
    var data = doc.data();
    if(data) this.createFromData(data,this);
    return this;
  }

  /**
   * Set document data directly
   * @param key
   * @param value
   */
  setParam(key: string, value: any): this {
    this[key] = value;
    this['storedFields'].push(key);
    return this;
  }

  /**
   * Get document data directly
   * @param key
   * @param value
   */
  getParam(key: string, defaultValue: any): any {
    return typeof this[key] !== 'undefined' ? this[key] : defaultValue
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
  static onAllList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    switch (eventType) {
      case LIST_EVENTS.ADDEDD:
        return this.onCreatedList(callback, LIST_EVENTS.ADDEDD);
        break;
      case LIST_EVENTS.REMOVED:
        return this.onAllList(callback, LIST_EVENTS.REMOVED);
        break;
      case LIST_EVENTS.MODIFIED:
        return this.onUpdatedList(callback, LIST_EVENTS.MODIFIED);
        break;
      default:
        return this.onAllList(callback);
        break;
    }
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
   * @throws Error if called on a model not created via getModel()
   */
  onAllList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    this.checkInstanceQueryAllowed();
    switch (eventType) {
      case LIST_EVENTS.ADDEDD:
        return this.onCreatedList(callback, LIST_EVENTS.ADDEDD);
        break;
      case LIST_EVENTS.REMOVED:
        return this.onAllList(callback, LIST_EVENTS.REMOVED);
        break;
      case LIST_EVENTS.MODIFIED:
        return this.onUpdatedList(callback, LIST_EVENTS.MODIFIED);
        break;
      default:
        return this.onAllList(callback);
        break;
    }
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
   * @throws Error if called on a model not created via getModel()
   */
  onModeList(options: ModelAllListOptions) {
    this.checkInstanceQueryAllowed();
    var that: any = this;
    return that.query()
      .orderBy(BaseModel.CREATED_AT_FLAG)
      .onMode(options);
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
  static onModeList(options: ModelAllListOptions) {
    var that: any = this;
    return that.query()
      .orderBy(this.CREATED_AT_FLAG)
      .onMode(options);
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
  static onList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    var that = this;
    var res = () => { };
    var object: any = new this();
    object.setModelType(this);
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onList() function "
      );
      return res;
    } else {
      return this.query()
        .orderBy(this.CREATED_AT_FLAG)
        .on(callback, eventType);
    }
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
   * @throws Error if called on a model not created via getModel()
   */
  onList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    this.checkInstanceQueryAllowed();
    var that: any = this.getModelType();
    var res = () => { };
    var object: any = this.getCurrentModel();
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onList() function "
      );
      return res;
    } else {
      var that: any = this;
      return that.query()
        .orderBy(BaseModel.CREATED_AT_FLAG)
        .on(callback, eventType);
    }
  }

  /**
   * Get New element in collectio
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
  static onCreatedList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    var res = () => { };
    var object: any = new this();
    object.setModelType(this);
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onAddList() function "
      );
      return res;
    }

    var timestamp = new Date().getTime();
    return this.query()
      .orderBy(this.CREATED_AT_FLAG)
      .startAt(timestamp)
      .on(callback, eventType);
  }


  /**
   * Get New element in collectio
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
   * @throws Error if called on a model not created via getModel()
   */
  onCreatedList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    this.checkInstanceQueryAllowed();
    var res = () => { };
    var that: any = this.getModelType();
    var object: any = this.getCurrentModel();
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onAddList() function "
      );
      return res;
    }

    var timestamp = new Date().getTime();
    var that: any = this;
    return that.query()
      .orderBy(BaseModel.CREATED_AT_FLAG)
      .startAt(timestamp)
      .on(callback, eventType);
  }

  /**
   * Get Updated element in collectio
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
   * @throws Error if called on a model not created via getModel()
   */
  onUpdatedList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    this.checkInstanceQueryAllowed();
    var res = () => { };
    var that: any = this.getModelType();
    var object: any = this.getCurrentModel();
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onUpdatedList() function "
      );
      return res;
    }
    var timestamp = new Date().getTime();
    var that: any = this;
    return that.query()
      .orderBy(BaseModel.UPDATED_AT_FLAG)
      .startAt(timestamp)
      .on(callback, eventType);
  }


  /**
   * Get Updated element in collectio
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
  static onUpdatedList(
    callback: CallableFunction,
    eventType?: LIST_EVENTS
  ): CallableFunction {
    var res = () => { };
    var object: any = new this();
    object.setModelType(this);
    if (!object.getReference()) {
      console.error(
        "The model path params is not set and can't run onUpdatedList() function "
      );
      return res;
    }
    var timestamp = new Date().getTime();
    return this.query()
      .orderBy(BaseModel.UPDATED_AT_FLAG)
      .startAt(timestamp)
      .on(callback, eventType);
  }

  format(field: string, format: string) {
    return this.moment(field).format(format);
  }

  moment(field: string) {
    const value: Timestamp = this[field];
    return moment.unix(value?.seconds);
  }

  date(field: string) {
    const value: Timestamp = this[field];
    if (value?.seconds) {
      return new Date(value?.seconds);
    } else {
      return new Date();
    }
  }

  initAutoTime(): void {
    if (this.isAutoTime) {
      if (!this.created_at) {
        this[BaseModel.CREATED_AT_FLAG] = new Date().getTime();
        this.created_at = new Date().getTime();
      }
      this[BaseModel.UPDATED_AT_FLAG] = new Date().getTime();
      this['storedFields'].push(BaseModel.CREATED_AT_FLAG);
      this['storedFields'].push(BaseModel.UPDATED_AT_FLAG);
      this.updated_at = new Date().getTime();
    }
  }

  makeId(length: number) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }


  async getStorageFile(target: string): Promise<StorageReference> {
    await lazyLoadFirebaseStorage();
    var that = this;
    var uniqueId = this.getId() ? this.getId() : this.makeId(20);
    var path = (await this.getDocReferenceAsync())?.path + '/' + uniqueId + '/' + target;
    //printLog('path ----- ', path);
    var storage = FirestoreOrmRepository.getGlobalStorage();
    var storageRef = ref(storage);
    // Create a reference to 'mountains.jpg'
    var fileRef: any = ref(storageRef, path);
    fileRef['_put'] = fileRef.put;
    fileRef['_putString'] = fileRef.putString;
    fileRef.getRef = function () {
      if (that[target]) {
        var url = target[target];
        const refVal = ref(storage, url);
        if (refVal) {
          return refVal;
        } else {
          return fileRef;
        }
      } else {
        return fileRef;
      }
    };
    fileRef.uploadFile = async function (data: any,
      metadata?: UploadMetadata | undefined
      , onProcessingCallback: any = () => { }
      , onErrorCallback: any = () => { }
      , onFinishCallback: any = () => { }) {
      var uploadTask = this.put(data, metadata);
      return await that.initUpdateTask(
        uploadTask,
        target,
        onProcessingCallback,
        onErrorCallback,
        onFinishCallback
      );
    }
    fileRef.uploadString = async function (data: any,
      format?: StringFormat,
      metadata?: UploadMetadata
      , onProcessingCallback: any = () => { }
      , onErrorCallback: any = () => { }
      , onFinishCallback: any = () => { }) {
      var uploadTask = this.putString(data, format, metadata);
      return await that.initUpdateTask(
        uploadTask,
        target,
        onProcessingCallback,
        onErrorCallback,
        onFinishCallback
      );
    }
    fileRef.uploadFromUrl = async function (url: string
      , onProcessingCallback: any = () => { }
      , onErrorCallback: any = () => { }
      , onFinishCallback: any = () => { }) {
      try {
        await lazyLoadAxios();
        var response = await axios({
          method: 'get',
          url: url,
          responseType: 'arraybuffer'
        });
        var base64 = Buffer.from(response.data, 'binary').toString('base64');
        return await this.uploadString(
          base64,
          'base64',
          undefined,
          onProcessingCallback,
          onErrorCallback,
          onFinishCallback);
      } catch (err) {
        throw Error(err as any);
      }
    }
    return fileRef;
  }

  initUpdateTask(uploadTask: UploadTask, target: string
    , onProcessingCallback: any = () => { }
    , onErrorCallback: any = () => { }
    , onFinishCallback: any = () => { }) {
    var that = this;
    return new Promise(async (resolve, reject) => {
      uploadTask.on('state_changed',
        // Processing 
        onProcessingCallback,
        // Error 
        (error: any) => {
          reject(error);
          onErrorCallback(error)
        },
        // Finish
        async () => {
          await lazyLoadFirebaseStorage();
          onFinishCallback(uploadTask);
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL: string) => {
            // printLog('File available at', downloadURL);
            that[target] = downloadURL;
            // printLog('that', that.getData());
            resolve(downloadURL);
          });
        });
    });
  }



  getCreatedAt(): Moment | null {
    return this.created_at ? moment.unix(this.created_at / 1000) : null;
  }

  getUpdatedAt(): Moment | null {
    return this.updated_at ? moment.unix(this.updated_at / 1000) : null;
  }

  async save(customId?: string): Promise<this> {
    const that: any = this;
    if (that.observeSaveBefore) {
      that.observeSaveBefore();
    }
    if (!this.verifyRequiredFields()) {
      return this;
    }
    this.initAutoTime();

    if (this.getRepository()) {
      await this.getRepository().save(this, customId);
    } else {
      console.error('No repository!');
    }
    if (that.observeSaveAfter) {
      that.observeSaveAfter();
    }
    return this;
  }

  // ===========================
  // Generic ORM Instance Alias Functions
  // ===========================

  /**
   * Alias for save() - Persists the current instance to the database.
   * Common alias used in many ORM frameworks for creating new records.
   * 
   * @param {string} [customId] - Optional custom ID for the document.
   * @returns {Promise<this>} A promise that resolves to the current instance after creation.
   */
  async create(customId?: string): Promise<this> {
    return await this.save(customId);
  }

  /**
   * Alias for save() - Updates the current instance in the database.
   * Common alias used in many ORM frameworks for updating existing records.
   * 
   * @param {Partial<this>} [updateData] - Optional data to update the instance with before saving.
   * @returns {Promise<this>} A promise that resolves to the current instance after update.
   */
  async update(updateData?: Partial<this>): Promise<this> {
    if (updateData) {
      Object.assign(this, updateData);
    }
    return await this.save();
  }

  /**
   * Alias for remove() - Destroys the current instance in the database.
   * Common alias used in many ORM frameworks.
   * 
   * @returns {Promise<boolean>} A promise that resolves to true if the destruction was successful.
   */
  async destroy(): Promise<boolean> {
    return await this.remove();
  }

  /**
   * Alias for remove() - Deletes the current instance from the database.
   * Common alias used in many ORM frameworks.
   * 
   * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful.
   */
  async delete(): Promise<boolean> {
    return await this.remove();
  }

  getReferencePath(): string {
    return this['referencePath'];
  }

  async getDocRefPath(): Promise<string | undefined> {
    const ref = await this.getDocReferenceAsync();
    return ref?.path;
  }


  /**
   * Initializes an instance of the model by retrieving data from a specified reference path.
   * @param path - The reference path to retrieve the data from.
   * @returns A promise that resolves to an instance of the model with the retrieved data, or null if the reference path is not provided or the repository is not available.
   */
  static async initByRef<T>(this: { new(): T },
    path?: string
  ): Promise<T | null> {
    var object: BaseModel & T = (new this()) as BaseModel & T;
    var res: any;
    if (!path) {
      console.error("No ref path!");
      return null;
    }

    if (object.getRepository()) {
      const doc = await getDocument(path);
      res = object.initFromDoc(doc);
      object.id = doc.id;
      object['referencePath'] = doc.ref.parent.path;
      object.is_exist = true;
    } else {
      console.error("No repository!");
    }
    return res;
  }

  /**
   * Finds and retrieves an array of objects that match the specified criteria.
   * 
   * @template T - The type of the objects to be retrieved.
   * @param {string} fieldPath - The field path to filter on.
   * @param {WhereFilterOp} opStr - The comparison operator.
   * @param {any} value - The value to compare against.
   * @returns {Promise<Array<T>>} - A promise that resolves to an array of objects that match the specified criteria.
   */
  static async find<T>(this: { new(): T }, fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<Array<T>> {
    var that: any = this;
    return await that.where(fieldPath, opStr, value).get();
  }

  /**
   * Finds a single document in the collection that matches the specified criteria.
   * 
   * @template T - The type of the document to be returned.
   * @param {string} fieldPath - The field path to query on.
   * @param {WhereFilterOp} opStr - The operator to use for the query.
   * @param {any} value - The value to compare against.
   * @returns {Promise<T | null>} A promise that resolves to the matching document, or null if no document is found.
   */
  static async findOne<T>(this: { new(): T }, fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<T | null> {
    var that: any = this;
    return await that.where(fieldPath, opStr, value).getOne();
  }

  // ===========================
  // Generic ORM Alias Functions
  // ===========================

  /**
   * Alias for getAll() - Gets all documents from the collection.
   * Common alias used in many ORM frameworks.
   * 
   * @template T - The type of the document to be returned.
   * @param {Array<any>} [whereArr] - An array of where conditions.
   * @param {{ fieldPath: string | FieldPath; directionStr?: OrderByDirection }} [orderBy] - The ordering specification.
   * @param {number} [limit] - The maximum number of documents to retrieve.
   * @param {{ [key: string]: string }} [params] - Additional parameters for the query.
   * @returns {Promise<Array<T>>} - A promise that resolves to an array of documents.
   */
  static async all<T>(this: { new(): T },
    whereArr?: Array<any>,
    orderBy?: {
      fieldPath: string | FieldPath;
      directionStr?: OrderByDirection;
    },
    limit?: number,
    params?: { [key: string]: string }
  ): Promise<Array<T>> {
    var that: any = this;
    return await that.getAll(whereArr, orderBy, limit, params);
  }

  /**
   * Alias for findOne() - Finds the first document that matches the specified criteria.
   * Common alias used in many ORM frameworks.
   * 
   * @template T - The type of the document to be returned.
   * @param {string} fieldPath - The field path to query on.
   * @param {WhereFilterOp} opStr - The operator to use for the query.
   * @param {any} value - The value to compare against.
   * @returns {Promise<T | null>} A promise that resolves to the first matching document, or null if no document is found.
   */
  static async first<T>(this: { new(): T }, fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<T | null> {
    var that: any = this;
    return await that.findOne(fieldPath, opStr, value);
  }

  /**
   * Creates a new instance of the model with the given data and saves it to the database.
   * Common alias used in many ORM frameworks.
   * 
   * @template T - The type of the document to be created.
   * @param {Partial<T>} data - The data to populate the new instance with.
   * @param {string} [customId] - Optional custom ID for the document.
   * @returns {Promise<T>} A promise that resolves to the created and saved instance.
   */
  static async create<T>(this: { new(): T }, data: Partial<T>, customId?: string): Promise<T> {
    const instance = new this() as T & BaseModel;
    
    // Populate the instance with the provided data
    Object.assign(instance, data);
    
    // Save the instance to the database
    await instance.save(customId);
    
    return instance;
  }

  /**
   * Updates documents in the collection that match the specified criteria.
   * Common alias used in many ORM frameworks.
   * 
   * @template T - The type of the document to be updated.
   * @param {string} fieldPath - The field path to query on.
   * @param {WhereFilterOp} opStr - The operator to use for the query.
   * @param {any} value - The value to compare against.
   * @param {Partial<T>} updateData - The data to update the matching documents with.
   * @returns {Promise<Array<T>>} A promise that resolves to an array of updated documents.
   */
  static async update<T>(this: { new(): T }, 
    fieldPath: string,
    opStr: WhereFilterOp,
    value: any,
    updateData: Partial<T>): Promise<Array<T>> {
    var that: any = this;
    const instances = await that.find(fieldPath, opStr, value);
    const updatedInstances: Array<T> = [];
    
    for (const instance of instances) {
      // Update the instance with new data
      Object.assign(instance, updateData);
      // Save the updated instance
      await (instance as any).save();
      updatedInstances.push(instance);
    }
    
    return updatedInstances;
  }

  /**
   * Alias for find() followed by remove() - Destroys documents that match the specified criteria.
   * Common alias used in many ORM frameworks.
   * 
   * @template T - The type of the document to be destroyed.
   * @param {string} fieldPath - The field path to query on.
   * @param {WhereFilterOp} opStr - The operator to use for the query.
   * @param {any} value - The value to compare against.
   * @returns {Promise<boolean>} A promise that resolves to true if all documents were successfully destroyed.
   */
  static async destroy<T>(this: { new(): T }, 
    fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<boolean> {
    var that: any = this;
    const instances = await that.find(fieldPath, opStr, value);
    let allDestroyed = true;
    
    for (const instance of instances) {
      const destroyed = await (instance as any).remove();
      if (!destroyed) {
        allDestroyed = false;
      }
    }
    
    return allDestroyed;
  }


  /**
   * Finds documents in the collection that match the specified criteria.
   * 
   * @param fieldPath - The field path to filter on.
   * @param opStr - The comparison operator.
   * @param value - The value to compare against.
   * @returns A promise that resolves to an array of documents that match the criteria.
   * @throws Error if called on a model not created via getModel()
   */
  async find(fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<Array<this>> {
    this.checkInstanceQueryAllowed();
    var that: any = this;
    return await that.where(fieldPath, opStr, value).get();
  }

  /**
   * Retrieves a snapshot of the document associated with this model.
   * @returns A promise that resolves with the document snapshot.
   */
  async getSnapshot(): Promise<DocumentSnapshot> {
    const docRef = await this.getDocReferenceAsync();
    if (!docRef) {
      throw new Error("Document reference is not available");
    }
    return new Promise((resolve, reject) => {
      onDocumentSnapshot(docRef, (doc) => {
        if (doc) {
          resolve(doc);
        } else {
          reject(doc);
        }
      })
    })
  }

  /**
   * Finds a single document in the collection that matches the specified criteria.
   * 
   * @param fieldPath - The field path to query on.
   * @param opStr - The comparison operator.
   * @param value - The value to compare against.
   * @returns A promise that resolves to the found document or null if no document is found.
   * @throws Error if called on a model not created via getModel()
   */
  async findOne(fieldPath: string,
    opStr: WhereFilterOp,
    value: any): Promise<this | null> {
    this.checkInstanceQueryAllowed();
    var that: any = this;
    return await that.where(fieldPath, opStr, value).getOne();
  }

  /**
   * Retrieves the required fields for the model.
   * @returns An array of strings representing the required fields.
   */
  getRequiredFields(): Array<string> {
    var that: any = this;
    return that.requiredFields ? that.requiredFields : [];
  }

  /**
   * Verifies if all the required fields of the model have values.
   * @returns {boolean} Returns true if all the required fields have values, otherwise returns false.
   */
  verifyRequiredFields(): boolean {
    var that: any = this;
    var fields = this.getRequiredFields();
    var result = true;
    for (var i = 0; fields.length > i; i++) {
      if (that[fields[i]] == null || typeof that[fields[i]] === undefined) {
        result = false;
        console.error(
          this['referencePath'] +
          "/:" +
          this['pathId'] +
          " - " +
          "Can't save " +
          fields[i] +
          " with null!"
        );
      }
    }
    return result;
  }

  /**
   * Retrieves the field name for the given key.
   * If an aliasFieldsMapper is defined and it contains a mapping for the key, the mapped field name is returned.
   * Otherwise, the key itself is returned as the field name.
   * 
   * @param key - The key for which to retrieve the field name.
   * @returns The field name corresponding to the key.
   */
  getFieldName(key: string): string {
    return this['aliasFieldsMapper'] && this['aliasFieldsMapper'][key] ? this['aliasFieldsMapper'][key] : key;
  }

  /**
   * Returns the alias name for the given key.
   * If a reverse alias fields mapper is defined and the key exists in the mapper, the corresponding alias name is returned.
   * Otherwise, the key itself is returned.
   * 
   * @param key - The key for which to retrieve the alias name.
   * @returns The alias name for the given key.
   */
  getAliasName(key: string): string {
    return this['reverseAliasFieldsMapper'] && this['reverseAliasFieldsMapper'][key] ? this['reverseAliasFieldsMapper'][key] : key;
  }

  /**
   * Retrieves the document data as an object.
   * 
   * @param useAliasName - Indicates whether to use the alias name for field names.
   * @returns An object containing the document data.
   */
  getDocumentData(useAliasName: boolean = false): Object {
    var data = {};
    this['storedFields'].forEach((fieldName: string) => {
      fieldName = this.getFieldName(fieldName);
      var val;
      if (typeof this[this.getAliasName(fieldName)] !== 'undefined') {
        val = this[this.getAliasName(fieldName)];
      } else if (typeof this[fieldName] !== 'undefined') {
        val = this[fieldName];
      } else if (this['data'] && typeof this['data'][fieldName] !== 'undefined') {
        val = this['data'][fieldName];
      }
      if (useAliasName) {
        fieldName = this.getAliasName(fieldName);
      }
      if (val instanceof BaseModel) {
        data[fieldName] = val.getDocReference();
      } else if (typeof val !== 'undefined') {
        data[fieldName] = val;
      }
    });
    return data;
  }

  /**
   * Copies the properties from the given object to the current object.
   * Only copies properties that are defined in the given object.
   * 
   * @param object - The object from which to copy the properties.
   */
  copy(object: this) {
    for (let key in object.getData(true)) {
      if (typeof object[key] !== 'undefined') {
        this[key] = object[key];
      }
    }
  }

  /**
   * Alias of getDocumentData
   */
  getData(useAliasName: boolean = false): Object {
    var result = {};
    var data = this.getDocumentData(useAliasName);
    // printLog('data -- ',data);
    for (var key in data) {
      if (!(this['ignoredFields'] && this['ignoredFields'].includes(key)) && typeof data[key] !== 'undefined') {
        result[key] = data[key];
      }
    }
    return result;
  }

  /**
   * Retrieves the path list for the current model instance.
   * The path list is an array of objects, where each object represents a segment of the path.
   * Each object has a `type` property indicating whether it's a "collection" or "document",
   * and a `value` property containing the corresponding path segment value.
   * If any path segment is missing, it returns `false`.
   * 
   * @returns An array of objects representing the path segments, or `false` if any segment is missing.
   */
  getPathList(): Array<{ type: string; value: string }> | boolean {
    var that: any = this;
    var result = [];
    var path = this.getReferencePath();
    var newTxt = path.split("/");
    let prev = null;
    for (var x = 0; x < newTxt.length; x++) {
      const type: string = prev !== 'collection' ? "collection" : 'document';
      var subPath = newTxt[x];
      if (subPath.search(":") != -1) {
        subPath = subPath.replace(":", "");
        var value;
        if (that.pathParams.has(subPath)) {
          value = that.pathParams.get(subPath);
        } else if (that[subPath]) {
          value = that[subPath];
        } else if (FirestoreOrmRepository.getGlobalPath(subPath)) {
          value = FirestoreOrmRepository.getGlobalPath(subPath);
        } else {
          console.error(
            this['referencePath'] +
            "/:" +
            this['pathId'] +
            " - " +
            subPath +
            " is missing!"
          );
          return false;
        }
        result.push({
          type,
          value: value
        });
      } else {
        result.push({
          type,
          value: subPath
        });
      }
      prev = type;
    }
    return result;
  }

  /**
   * Initializes the path of the model from a string.
   * @param path - The string representing the path.
   */
  initPathFromStr(path: string) {
    const keysWithPos = this.getPathListKeysWithPos();
    var that: any = this;
    var newTxt = path.split("/");

    for (const prop of keysWithPos) {
      that[prop.key] = newTxt[prop.pos];
    }
  }

  /**
   * Retrieves the parameters required for constructing the path list.
   * @returns An object containing the path list parameters.
   */
  getPathListParams(): any {
    var that: any = this;
    var result: any = {};
    var keys = this.getPathListKeys();

    for (var i = 0; i < keys.length; i++) {
      var subPath = keys[i];
      var value;
      if (that.pathParams.has(subPath)) {
        value = that.pathParams.get(subPath);
      } else if (that[subPath]) {
        value = that[subPath];
      } else if (FirestoreOrmRepository.getGlobalPath(subPath)) {
        value = FirestoreOrmRepository.getGlobalPath(subPath);
      } else {
        console.error(
          this['referencePath'] +
          "/:" +
          this['pathId'] +
          " - " +
          subPath +
          " is missing!"
        );
        return false;
      }
      result[subPath] = value;
    }
    return result;
  }

  /**
   * Returns an array of keys extracted from the reference path.
   * @returns An array of string keys.
   */
  getPathListKeys(): Array<string> {
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

  /**
   * Returns an array of objects containing the keys and positions of the path list.
   * @returns An array of objects with `key` and `pos` properties.
   */
  getPathListKeysWithPos(): Array<{ key: string; pos: number }> {
    var that: any = this;
    var result = [];
    var path = this.getReferencePath();
    var newTxt = path.split("/");
    for (var x = 0; x < newTxt.length; x++) {
      var subPath = newTxt[x];
      if (subPath.search(":") != -1) {
        subPath = subPath.replace(":", "");
        result.push({ key: subPath, pos: x });
      }
    }
    return result;
  }

  /**
   * Converts the model instance to a JSON object.
   * @returns The JSON representation of the model instance.
   */
  toJSON() {
    return this.getData()
  }
}