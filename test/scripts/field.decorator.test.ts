import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";
import { config } from "../config";

// Test model with various field configurations
@Model({
  reference_path: 'field_test',
  path_id: 'field_test_id'
})
class FieldTest extends BaseModel {
  @Field({
    is_required: true
  })
  public requiredField!: string;

  @Field({
    is_required: false,
    field_name: 'custom_field_name'
  })
  public customNameField?: string;

  @Field({
    is_required: false,
    is_text_indexing: true
  })
  public textIndexedField?: string;

  @Field({
    is_required: false,
    defaultValue: 'default value'
  })
  public fieldWithDefault?: string;

  @Field({
    is_required: false
  })
  public nullableField?: string | null;

  @Field({
    is_required: false
  })
  public arrayField?: string[];

  @Field({
    is_required: false
  })
  public objectField?: { [key: string]: any };

  @Field({
    is_required: false
  })
  public dateField?: Date;

  @Field({
    is_required: false,
    ignore_field: true
  })
  public ignoredField?: string;
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

describe('Field Decorator', () => {
  // Clean up test items before tests
  beforeEach(async () => {
    const items = await FieldTest.getAll();
    for (const item of items) {
      await item.remove();
    }
  });

  test('should handle required fields correctly', async () => {
    // Create model without required field
    const model = new FieldTest();
    
    // Verify should fail because of missing required field
    const isValid = model.verifyRequiredFields();
    expect(isValid).toBe(false);
    
    // Set the required field
    model.requiredField = 'required value';
    
    // Now verification should pass
    expect(model.verifyRequiredFields()).toBe(true);
  });

  test('should handle custom field names', async () => {
    // Create and save model with custom field name
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.customNameField = 'custom name value';
    
    await model.save();
    
    // Get the data to check field name mapping
    const data = model.getData();
    
    // Check that the field name is mapped correctly
    expect(data.custom_field_name).toBe('custom name value');
    expect(data.customNameField).toBeUndefined();
  }, 10000);

  test('should handle text indexing correctly', async () => {
    // Create and save model with text indexed field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.textIndexedField = 'This is indexed text';
    
    await model.save();
    
    // Get the data
    const data = model.getData();
    
    // Check that the text indexing metadata is added
    expect(data.textIndexedField).toBe('This is indexed text');
    expect(data.textIndexedField__t).toBe('this is indexed text');
  }, 10000);

  test('should handle default values', async () => {
    // Create model without setting the field with default
    const model = new FieldTest();
    model.requiredField = 'required value';
    
    // Save the model
    await model.save();
    
    // Get the data
    const data = model.getData();
    
    // Check that the default value is applied
    expect(model.fieldWithDefault).toBe('default value');
    expect(data.fieldWithDefault).toBe('default value');
  }, 10000);

  test('should handle nullable fields', async () => {
    // Create model with null field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.nullableField = null;
    
    // Save the model
    await model.save();
    
    // Get the data
    const data = model.getData();
    
    // Check that null is preserved
    expect(data.nullableField).toBeNull();
  }, 10000);

  test('should handle array fields', async () => {
    // Create model with array field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.arrayField = ['item1', 'item2', 'item3'];
    
    // Save the model
    await model.save();
    
    // Get the model by ID
    const id = model.getId();
    const loadedModel = new FieldTest();
    await loadedModel.load(id);
    
    // Check that the array is preserved
    expect(loadedModel.arrayField).toEqual(['item1', 'item2', 'item3']);
  }, 10000);

  test('should handle object fields', async () => {
    // Create model with object field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.objectField = { 
      key1: 'value1', 
      key2: 42, 
      nested: { 
        subkey: 'subvalue' 
      } 
    };
    
    // Save the model
    await model.save();
    
    // Get the model by ID
    const id = model.getId();
    const loadedModel = new FieldTest();
    await loadedModel.load(id);
    
    // Check that the object is preserved
    expect(loadedModel.objectField).toEqual({
      key1: 'value1',
      key2: 42,
      nested: {
        subkey: 'subvalue'
      }
    });
  }, 10000);

  test('should handle Date fields', async () => {
    // Create model with date field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.dateField = new Date('2023-01-01T12:00:00Z');
    
    // Save the model
    await model.save();
    
    // Get the model by ID
    const id = model.getId();
    const loadedModel = new FieldTest();
    await loadedModel.load(id);
    
    // Check that the date is preserved
    expect(loadedModel.dateField instanceof Date).toBe(true);
    expect(loadedModel.dateField?.toISOString()).toBe('2023-01-01T12:00:00.000Z');
  }, 10000);

  test('should ignore fields marked with ignore_field', async () => {
    // Create model with ignored field
    const model = new FieldTest();
    model.requiredField = 'required value';
    model.ignoredField = 'this should be ignored';
    
    // Save the model
    await model.save();
    
    // Get the data
    const data = model.getData();
    
    // Check that the ignored field is not saved
    expect(data.ignoredField).toBeUndefined();
  }, 10000);
});