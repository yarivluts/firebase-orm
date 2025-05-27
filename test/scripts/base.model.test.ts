import { BaseModel, Model, Field, FirestoreOrmRepository } from "../../index";
import { config } from "../config";
import * as firebase from "firebase";
import 'firebase/storage';

// Create a test model for testing purposes
@Model({
  reference_path: 'test_models',
  path_id: 'test_id'
})
class TestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public requiredField!: string;

  @Field({
    is_required: false,
  })
  public optionalField?: string;

  @Field({
    is_required: true,
    field_name: 'custom_field_name'
  })
  public customNameField!: string;

  @Field({
    is_text_indexing: true
  })
  public indexedField?: string;
}

// Initialize Firebase for tests
let firebaseApp: any;
let connection: any;
let storage: any;

beforeAll(() => {
  // Initialize Firebase with test config
  firebaseApp = firebase.initializeApp(config.api.firebase);
  connection = firebaseApp.firestore();
  storage = firebaseApp.storage();

  // Initialize the ORM
  FirestoreOrmRepository.initGlobalConnection(connection);
  FirestoreOrmRepository.initGlobalStorage(storage);
});

describe('BaseModel Core Functionality', () => {
  test('verifyRequiredFields should validate required fields', () => {
    const model = new TestModel();
    
    // Without setting required fields
    expect(model.verifyRequiredFields()).toBe(false);
    
    // Set one required field, still missing the other
    model.requiredField = 'value';
    expect(model.verifyRequiredFields()).toBe(false);
    
    // Set all required fields
    model.customNameField = 'value';
    expect(model.verifyRequiredFields()).toBe(true);
  });

  test('loadFromString should deserialize JSON into model', () => {
    const model = new TestModel();
    const jsonData = JSON.stringify({
      requiredField: 'test value',
      optionalField: 'optional',
      customNameField: 'custom field',
      indexedField: 'indexed'
    });
    
    const loadedModel = model.loadFromString(jsonData);
    
    expect(loadedModel.requiredField).toBe('test value');
    expect(loadedModel.optionalField).toBe('optional');
    expect(loadedModel.customNameField).toBe('custom field');
    expect(loadedModel.indexedField).toBe('indexed');
  });

  test('toString should serialize model to JSON string', () => {
    const model = new TestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    model.indexedField = 'indexed';
    
    const jsonString = model.toString();
    const parsed = JSON.parse(jsonString);
    
    expect(parsed.requiredField).toBe('test value');
    expect(parsed.custom_field_name).toBe('custom field');
    expect(parsed.indexedField).toBe('indexed');
  });

  test('getData should return an object with model data', () => {
    const model = new TestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    
    const data = model.getData();
    
    expect(data.requiredField).toBe('test value');
    expect(data.custom_field_name).toBe('custom field');
  });

  test('createFromData should populate model from data object', () => {
    const model = new TestModel();
    const data = {
      requiredField: 'required value',
      optionalField: 'optional value',
      custom_field_name: 'custom field value'
    };
    
    model.createFromData(data);
    
    expect(model.requiredField).toBe('required value');
    expect(model.optionalField).toBe('optional value');
    expect(model.customNameField).toBe('custom field value');
  });

  test('getRequiredFields should return list of required fields', () => {
    const model = new TestModel();
    const requiredFields = model.getRequiredFields();
    
    expect(requiredFields).toContain('requiredField');
    expect(requiredFields).toContain('customNameField');
    expect(requiredFields).not.toContain('optionalField');
    expect(requiredFields).not.toContain('indexedField');
  });
});