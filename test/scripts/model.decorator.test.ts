import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";
import { config } from "../config";

// Test different model configurations
@Model({
  reference_path: 'basic_models',
  path_id: 'basic_id'
})
class BasicModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;
}

@Model({
  reference_path: 'websites/:website_id/nested_models',
  path_id: 'nested_id'
})
class NestedPathModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public title!: string;
}

@Model({
  reference_path: 'versioned_models',
  path_id: 'versioned_id',
  version_field: 'version'
})
class VersionedModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public content!: string;

  @Field({
    is_required: false
  })
  public version?: number;
}

@Model({
  reference_path: 'timestamped_models',
  path_id: 'timestamped_id',
  timestamps: true
})
class TimestampedModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public data!: string;
}

@Model({
  reference_path: 'models_with_ignored_fields',
  path_id: 'ignored_fields_id',
  ignored_fields: ['secretField', 'temporaryData']
})
class ModelWithIgnoredFields extends BaseModel {
  @Field({
    is_required: true,
  })
  public publicField!: string;

  @Field({
    is_required: false
  })
  public secretField?: string;

  @Field({
    is_required: false
  })
  public temporaryData?: any;
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
  FirestoreOrmRepository.initGlobalPath('website_id', 'test-website-123');
});

describe('Model Decorator', () => {
  test('should set reference path and ID field', () => {
    const model = new BasicModel();
    model.name = 'Basic Model';
    
    // Check that the reference path is set correctly
    expect(model.getReferencePath()).toBe('basic_models');
    
    // Check that the ID field name is correct
    expect(model['pathId']).toBe('basic_id');
  });

  test('should handle nested paths with global path variables', async () => {
    const model = new NestedPathModel();
    model.title = 'Nested Model';
    
    // Save the model to get its full path
    await model.save();
    
    // Check that the reference path is constructed correctly
    expect(model.getReferencePath()).toBe('websites/test-website-123/nested_models');
    
    // Clean up
    await model.remove();
  }, 10000);

  test('should handle versioning', async () => {
    const model = new VersionedModel();
    model.content = 'Version 1 content';
    
    // Save the model (should set version to 1)
    await model.save();
    
    // Check that version field is set
    expect(model.version).toBe(1);
    
    // Update content and save again
    model.content = 'Version 2 content';
    await model.save();
    
    // Version should be incremented
    expect(model.version).toBe(2);
    
    // Clean up
    await model.remove();
  }, 10000);

  test('should add timestamps', async () => {
    const model = new TimestampedModel();
    model.data = 'Timestamped data';
    
    // Save the model (should add created_at and updated_at)
    await model.save();
    
    // Get data and check for timestamps
    const data = model.getData();
    expect(data.created_at).toBeDefined();
    expect(data.updated_at).toBeDefined();
    
    // Record initial timestamps
    const createdAt = data.created_at;
    const updatedAt = data.updated_at;
    
    // Wait a moment to ensure timestamps would be different
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update model
    model.data = 'Updated data';
    await model.save();
    
    // Get updated data
    const updatedData = model.getData();
    
    // created_at should stay the same, updated_at should change
    expect(updatedData.created_at).toBe(createdAt);
    expect(updatedData.updated_at).not.toBe(updatedAt);
    
    // Clean up
    await model.remove();
  }, 10000);

  test('should respect ignored fields', async () => {
    const model = new ModelWithIgnoredFields();
    model.publicField = 'Public value';
    model.secretField = 'Secret value';
    model.temporaryData = { temp: 'data' };
    
    // Save the model
    await model.save();
    
    // Get data and check that ignored fields are not saved
    const data = model.getData();
    expect(data.publicField).toBe('Public value');
    expect(data.secretField).toBeUndefined();
    expect(data.temporaryData).toBeUndefined();
    
    // Clean up
    await model.remove();
  }, 10000);

  test('should get collection reference', () => {
    const model = new BasicModel();
    
    // Get collection reference
    const collectionRef = model.getRepository().getCollectionReferenceByModel(model);
    
    // Check that collection reference is what we expect
    expect(collectionRef).toBeDefined();
    expect(collectionRef?.path).toBe('basic_models');
  });

  test('should get document reference after saving', async () => {
    const model = new BasicModel();
    model.name = 'Doc Ref Test';
    
    // Before saving, we can't get document reference
    expect(model.getRepository().getDocumentReferenceByModel(model)).toBeNull();
    
    // Save model to get an ID
    await model.save();
    
    // Now we should be able to get document reference
    const docRef = model.getRepository().getDocumentReferenceByModel(model);
    expect(docRef).toBeDefined();
    expect(docRef?.path).toContain('basic_models/');
    
    // Clean up
    await model.remove();
  }, 10000);

  test('should handle different ID generation strategies', async () => {
    const model = new BasicModel();
    model.name = 'ID Generation Test';
    
    // Check that ID is not set before saving
    expect(model.getId()).toBeUndefined();
    
    // Save the model to generate ID
    await model.save();
    
    // Check that ID is now set and follows expected format
    const id = model.getId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    
    // Clean up
    await model.remove();
  }, 10000);
});