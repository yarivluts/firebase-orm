import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";
import { config } from "../config";

// Create a test model for CRUD testing
@Model({
  reference_path: 'crud_test',
  path_id: 'crud_test_id'
})
class CrudTest extends BaseModel {
  @Field({
    is_required: true,
  })
  public title!: string;

  @Field({
    is_required: false,
  })
  public description?: string;

  @Field({
    is_required: false,
    field_name: 'created_date'
  })
  public createdDate?: string;

  @Field({
    is_required: false,
  })
  public isActive?: boolean;
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

describe('Model CRUD Operations', () => {
  // Clean up test items before tests
  beforeEach(async () => {
    const items = await CrudTest.getAll();
    for (const item of items) {
      await item.remove();
    }
  });

  test('should create a new model instance', async () => {
    // Create a new model
    const model = new CrudTest();
    model.title = 'Test Title';
    model.description = 'Test Description';
    model.createdDate = new Date().toISOString();
    model.isActive = true;
    
    // Save the model
    await model.save();
    
    // Check that the model has an ID after saving
    expect(model.getId()).toBeDefined();
    expect(typeof model.getId()).toBe('string');
  }, 10000);

  test('should read a model by ID', async () => {
    // Create a new model
    const model = new CrudTest();
    model.title = 'Read Test';
    model.description = 'Testing read operation';
    await model.save();
    
    // Get the ID
    const id = model.getId();
    
    // Create a new instance and load by ID
    const loadedModel = new CrudTest();
    await loadedModel.load(id);
    
    // Check that the model was loaded correctly
    expect(loadedModel.title).toBe('Read Test');
    expect(loadedModel.description).toBe('Testing read operation');
  }, 10000);

  test('should update an existing model', async () => {
    // Create a model
    const model = new CrudTest();
    model.title = 'Original Title';
    model.description = 'Original Description';
    await model.save();
    
    // Get the ID
    const id = model.getId();
    
    // Update the model
    model.title = 'Updated Title';
    model.description = 'Updated Description';
    await model.save();
    
    // Load the model again to verify updates
    const updatedModel = new CrudTest();
    await updatedModel.load(id);
    
    // Check that the updates were saved
    expect(updatedModel.title).toBe('Updated Title');
    expect(updatedModel.description).toBe('Updated Description');
  }, 10000);

  test('should delete a model', async () => {
    // Create a model
    const model = new CrudTest();
    model.title = 'Delete Test';
    await model.save();
    
    // Get the ID
    const id = model.getId();
    
    // Delete the model
    await model.remove();
    
    // Try to load the deleted model
    const deletedModel = new CrudTest();
    try {
      await deletedModel.load(id);
      // If no error is thrown, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected to throw an error when trying to load a deleted model
      expect(error).toBeDefined();
    }
  }, 10000);

  test('should get all models', async () => {
    // Create multiple models
    for (let i = 1; i <= 5; i++) {
      const model = new CrudTest();
      model.title = `Model ${i}`;
      model.isActive = i % 2 === 0; // alternating true/false
      await model.save();
    }
    
    // Get all models
    const allModels = await CrudTest.getAll();
    
    // Check that we got all models
    expect(allModels.length).toBe(5);
    
    // Check that we can filter by a field
    const activeModels = await CrudTest.getAll([['isActive', '==', true]]);
    expect(activeModels.length).toBe(2);
  }, 10000);

  test('should initialize a model', async () => {
    // Create a model
    const model = new CrudTest();
    model.title = 'Init Test';
    model.description = 'Testing init method';
    await model.save();
    
    // Get the ID
    const id = model.getId();
    
    // Initialize a new model with the same ID
    const initializedModel = new CrudTest();
    const result = await initializedModel.init(id);
    
    // Check that initialization was successful
    expect(result).toBe(initializedModel);
    expect(initializedModel.title).toBe('Init Test');
    expect(initializedModel.description).toBe('Testing init method');
  }, 10000);

  test('should get a snapshot of the model', async () => {
    // Create a model
    const model = new CrudTest();
    model.title = 'Snapshot Test';
    await model.save();
    
    // Get a snapshot
    const snapshot = await model.getSnapshot();
    
    // Check that the snapshot contains the correct data
    expect(snapshot).toBeDefined();
    expect(snapshot.exists).toBe(true);
    
    const data = snapshot.data();
    expect(data).toBeDefined();
    expect(data?.title).toBe('Snapshot Test');
  }, 10000);

  test('should batch save multiple models', async () => {
    // Create multiple models
    const models = [];
    for (let i = 1; i <= 3; i++) {
      const model = new CrudTest();
      model.title = `Batch Model ${i}`;
      models.push(model);
    }
    
    // Batch save the models
    await CrudTest.saveBatch(models);
    
    // Check that all models were saved with IDs
    models.forEach(model => {
      expect(model.getId()).toBeDefined();
    });
    
    // Get all models to verify they were saved
    const allModels = await CrudTest.getAll();
    expect(allModels.length).toBe(3);
  }, 10000);

  test('should handle empty results gracefully', async () => {
    // Query for non-existent models
    const emptyResults = await CrudTest.query()
      .where('title', '==', 'Non-existent Title')
      .get();
    
    // Check that the result is an empty array, not null
    expect(emptyResults).toEqual([]);
  }, 10000);
});