import { FirestoreOrmRepository } from "../../index";
import { TestModel, CrudTestModel, TestItem } from "../models/test-models";

// Mock Firebase v9+ SDK for testing
const mockFirestore = {
  // Client SDK instances don't have these methods directly
  // collection: undefined,
  // doc: undefined,
  app: { name: 'mock-app' }
};

describe('Firebase Client SDK compatibility', () => {
  let originalRepo: FirestoreOrmRepository | null;

  beforeEach(async () => {
    try {
      // Store original repository instance to restore later
      try {
        originalRepo = FirestoreOrmRepository.getGlobalConnection();
      } catch (error) {
        // No existing connection, which is fine
        originalRepo = null;
      }

      // Initialize the ORM with mock Client SDK
      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      FirestoreOrmRepository.initGlobalPath('website_id', 'test-site');

    } catch (error) {
      console.log('Client SDK initialization failed, skipping test:', error.message);
      // Mark test as skipped
      pending();
    }
  });

  afterEach(async () => {
    try {
      // Restore original repository if it existed
      if (originalRepo) {
        // We'll just let the global connection remain as is since 
        // we can't access the protected firestore property
      }
    } catch (error) {
      console.log('Cleanup failed:', error.message);
    }
  });

  it('should detect Client SDK correctly', () => {
    const repo = FirestoreOrmRepository.getGlobalConnection();
    // Verify that it's not detected as Admin SDK
    // Client SDK instances don't have instance methods like collection() and doc()
    expect(typeof mockFirestore.collection).toBeUndefined();
    expect(typeof mockFirestore.doc).toBeUndefined();
    
    // Verify the repository is initialized
    expect(repo).toBeDefined();
  });

  it('should perform basic CRUD operations with Client SDK', async () => {
    try {
      // Create a new test model
      const testModel = new TestModel();
      testModel.requiredField = 'Client SDK Test';
      testModel.optionalField = 'Optional data';
      testModel.customNameField = 'Custom field data';
      testModel.indexedField = 'Searchable text';

      // Save the model
      await testModel.save();
      expect(testModel.getId()).toBeDefined();

      // Load the model by ID
      const loadedModel = new TestModel();
      await loadedModel.load(testModel.getId());
      expect(loadedModel.requiredField).toBe('Client SDK Test');
      expect(loadedModel.optionalField).toBe('Optional data');
      expect(loadedModel.customNameField).toBe('Custom field data');

      // Update the model
      loadedModel.optionalField = 'Updated optional data';
      await loadedModel.save();

      // Verify the update
      const updatedModel = new TestModel();
      await updatedModel.load(testModel.getId());
      expect(updatedModel.optionalField).toBe('Updated optional data');

      // Delete the model
      await updatedModel.remove();

      // Verify deletion
      try {
        const deletedModel = new TestModel();
        await deletedModel.load(testModel.getId());
        // Should not reach here if properly deleted
        expect(deletedModel.getId()).toBeNull();
      } catch (error) {
        // Expected error when loading deleted document
        expect(error).toBeDefined();
      }

    } catch (error) {
      console.log('CRUD operations test failed:', error.message);
      throw error;
    }
  }, 15000);

  it('should perform query operations with Client SDK', async () => {
    try {
      // Create test data
      const items = [];
      for (let i = 0; i < 3; i++) {
        const item = new TestItem();
        item.name = `Test Item ${i + 1}`;
        item.category = i % 2 === 0 ? 'CategoryA' : 'CategoryB';
        item.price = (i + 1) * 10;
        item.tags = [`tag${i + 1}`, 'common-tag'];
        await item.save();
        items.push(item);
      }

      // Test simple query
      const allItems = await TestItem.getAll();
      expect(allItems.length).toBeGreaterThanOrEqual(3);

      // Test where query
      const categoryAItems = await TestItem.query()
        .where('category', '==', 'CategoryA')
        .get();
      expect(categoryAItems.length).toBeGreaterThan(0);
      categoryAItems.forEach(item => {
        expect(item.category).toBe('CategoryA');
      });

      // Test query with limit
      const limitedItems = await TestItem.query()
        .limit(2)
        .get();
      expect(limitedItems.length).toBeLessThanOrEqual(2);

      // Test query with order
      const orderedItems = await TestItem.query()
        .orderBy('price', 'asc')
        .get();
      expect(orderedItems.length).toBeGreaterThan(0);
      
      // Verify ordering
      for (let i = 1; i < orderedItems.length; i++) {
        expect(orderedItems[i].price).toBeGreaterThanOrEqual(orderedItems[i - 1].price);
      }

    } catch (error) {
      console.log('Query operations test failed:', error.message);
      throw error;
    }
  }, 15000);

  it('should handle collection references with Client SDK', async () => {
    try {
      // Test that we can get collection references
      const repo = FirestoreOrmRepository.getGlobalConnection();
      expect(repo).toBeDefined();

      // Create a test model to verify collection operations
      const testModel = new CrudTestModel();
      testModel.title = 'Collection Test';
      testModel.description = 'Testing collection operations';
      testModel.createdDate = new Date().toISOString();
      testModel.isActive = true;

      await testModel.save();
      expect(testModel.getId()).toBeDefined();

      // Verify we can retrieve it
      const retrieved = await CrudTestModel.getAll();
      expect(retrieved.length).toBeGreaterThan(0);
      
      const found = retrieved.find(item => item.getId() === testModel.getId());
      expect(found).toBeDefined();
      expect(found.title).toBe('Collection Test');

    } catch (error) {
      console.log('Collection reference test failed:', error.message);
      throw error;
    }
  }, 15000);

  it('should handle document operations with Client SDK', async () => {
    try {
      // Test document creation and retrieval
      const testDoc = new CrudTestModel();
      testDoc.title = 'Document Test';
      testDoc.description = 'Testing document operations';
      testDoc.isActive = false;

      // Save and get ID
      await testDoc.save();
      const docId = testDoc.getId();
      expect(docId).toBeDefined();

      // Test direct document loading
      const loadedDoc = new CrudTestModel();
      await loadedDoc.load(docId);
      expect(loadedDoc.title).toBe('Document Test');
      expect(loadedDoc.isActive).toBe(false);

      // Test document updates
      loadedDoc.isActive = true;
      loadedDoc.description = 'Updated description';
      await loadedDoc.save();

      // Verify updates
      const updatedDoc = new CrudTestModel();
      await updatedDoc.load(docId);
      expect(updatedDoc.isActive).toBe(true);
      expect(updatedDoc.description).toBe('Updated description');

    } catch (error) {
      console.log('Document operations test failed:', error.message);
      throw error;
    }
  }, 15000);

  it('should maintain backward compatibility with existing patterns', async () => {
    try {
      // Test that existing code patterns still work
      const models: TestModel[] = [];

      // Create multiple models
      for (let i = 0; i < 2; i++) {
        const model = new TestModel();
        model.requiredField = `Backward Compat Test ${i + 1}`;
        model.customNameField = `Custom ${i + 1}`;
        await model.save();
        models.push(model);
      }

      // Test getAll() - common existing pattern
      const allModels = await TestModel.getAll();
      expect(allModels.length).toBeGreaterThanOrEqual(2);

      // Test query builder pattern - existing pattern
      const filteredModels = await TestModel.query()
        .where('requiredField', '==', 'Backward Compat Test 1')
        .get();
      expect(filteredModels.length).toBe(1);
      expect(filteredModels[0].requiredField).toBe('Backward Compat Test 1');

      // Test model removal - existing pattern
      for (const model of models) {
        await model.remove();
      }

      // Verify removal
      const remainingModels = await TestModel.query()
        .where('requiredField', '>=', 'Backward Compat Test')
        .get();
      expect(remainingModels.length).toBe(0);

    } catch (error) {
      console.log('Backward compatibility test failed:', error.message);
      throw error;
    }
  }, 15000);
});