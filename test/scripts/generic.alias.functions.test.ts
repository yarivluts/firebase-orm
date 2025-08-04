import { initializeTestEnvironment, EXTENDED_TIMEOUT } from "../test-utils";
import { CrudTestModel } from "../models/test-models";

// Initialize Firebase for tests
let testEnv: any;

beforeAll(() => {
  // Initialize Firebase and ORM with test utilities
  testEnv = initializeTestEnvironment();
});

describe('Generic ORM Alias Functions', () => {
  
  beforeEach(async () => {
    // Clean up any existing test data before each test
    try {
      const existingItems = await CrudTestModel.getAll();
      for (const item of existingItems) {
        await item.remove();
      }
    } catch (error) {
      // Ignore errors in cleanup - collection might not exist yet
    }
  });

  describe('Static Alias Methods', () => {
    
    test('all() should be an alias for getAll()', async () => {
      // Create some test data
      const model1 = new CrudTestModel();
      model1.title = 'Test 1';
      model1.description = 'Description 1';
      await model1.save();

      const model2 = new CrudTestModel();
      model2.title = 'Test 2';
      model2.description = 'Description 2';
      await model2.save();

      // Test all() method
      const allItems = await CrudTestModel.all();
      expect(allItems.length).toBe(2);
      
      // Compare with getAll() to ensure same behavior
      const getAllItems = await CrudTestModel.getAll();
      expect(allItems.length).toBe(getAllItems.length);

      // Verify data content
      const titles = allItems.map(item => item.title).sort();
      expect(titles).toEqual(['Test 1', 'Test 2']);
    }, EXTENDED_TIMEOUT);

    test('first() should be an alias for findOne()', async () => {
      // Create test data
      const model = new CrudTestModel();
      model.title = 'Unique Title';
      model.description = 'Test description';
      await model.save();

      // Test first() method
      const foundItem = await CrudTestModel.first('title', '==', 'Unique Title');
      expect(foundItem).not.toBeNull();
      expect(foundItem!.title).toBe('Unique Title');
      expect(foundItem!.description).toBe('Test description');

      // Compare with findOne() to ensure same behavior
      const findOneItem = await CrudTestModel.findOne('title', '==', 'Unique Title');
      expect(foundItem!.title).toBe(findOneItem!.title);
      expect(foundItem!.description).toBe(findOneItem!.description);

      // Test case where no item is found
      const notFound = await CrudTestModel.first('title', '==', 'Non Existent');
      expect(notFound).toBeNull();
    }, EXTENDED_TIMEOUT);

    test('create() should create and save a new instance', async () => {
      const data = {
        title: 'Created Title',
        description: 'Created description',
        isActive: true
      };

      // Test create() method
      const createdItem = await CrudTestModel.create(data);
      expect(createdItem.title).toBe('Created Title');
      expect(createdItem.description).toBe('Created description');
      expect(createdItem.isActive).toBe(true);

      // Verify it was actually saved to database
      const foundItem = await CrudTestModel.findOne('title', '==', 'Created Title');
      expect(foundItem).not.toBeNull();
      expect(foundItem!.title).toBe('Created Title');
      expect(foundItem!.description).toBe('Created description');
    }, EXTENDED_TIMEOUT);

    test('create() should work with custom ID', async () => {
      const data = {
        title: 'Custom ID Title',
        description: 'Custom ID description'
      };
      const customId = 'custom-test-id';

      // Test create() with custom ID
      const createdItem = await CrudTestModel.create(data, customId);
      expect(createdItem.title).toBe('Custom ID Title');

      // Verify it was saved with the custom ID
      const foundItem = await CrudTestModel.findOne('title', '==', 'Custom ID Title');
      expect(foundItem).not.toBeNull();
      expect(foundItem!.getId()).toBe(customId);
    }, EXTENDED_TIMEOUT);

    test('update() should update matching documents', async () => {
      // Create test data
      const model1 = new CrudTestModel();
      model1.title = 'Update Test';
      model1.description = 'Original description';
      model1.isActive = false;
      await model1.save();

      const model2 = new CrudTestModel();
      model2.title = 'Update Test';
      model2.description = 'Another description';
      model2.isActive = false;
      await model2.save();

      // Test update() method
      const updateData = {
        description: 'Updated description',
        isActive: true
      };

      const updatedItems = await CrudTestModel.update('title', '==', 'Update Test', updateData);
      expect(updatedItems.length).toBe(2);

      // Verify both items were updated
      for (const item of updatedItems) {
        expect(item.description).toBe('Updated description');
        expect(item.isActive).toBe(true);
      }

      // Verify updates were persisted to database
      const foundItems = await CrudTestModel.find('title', '==', 'Update Test');
      expect(foundItems.length).toBe(2);
      for (const item of foundItems) {
        expect(item.description).toBe('Updated description');
        expect(item.isActive).toBe(true);
      }
    }, EXTENDED_TIMEOUT);

    test('destroy() should remove matching documents', async () => {
      // Create test data
      const model1 = new CrudTestModel();
      model1.title = 'Destroy Test';
      model1.description = 'To be destroyed';
      await model1.save();

      const model2 = new CrudTestModel();
      model2.title = 'Keep Test';
      model2.description = 'To be kept';
      await model2.save();

      // Test destroy() method
      const destroyResult = await CrudTestModel.destroy('title', '==', 'Destroy Test');
      expect(destroyResult).toBe(true);

      // Verify the item was destroyed
      const destroyedItem = await CrudTestModel.findOne('title', '==', 'Destroy Test');
      expect(destroyedItem).toBeNull();

      // Verify other items were not affected
      const keptItem = await CrudTestModel.findOne('title', '==', 'Keep Test');
      expect(keptItem).not.toBeNull();
      expect(keptItem!.description).toBe('To be kept');
    }, EXTENDED_TIMEOUT);

  });

  describe('Instance Alias Methods', () => {

    test('create() should be an alias for save()', async () => {
      const model = new CrudTestModel();
      model.title = 'Instance Create Test';
      model.description = 'Created via instance method';

      // Test instance create() method
      const result = await model.create();
      expect(result).toBe(model);

      // Verify it was saved to database
      const foundItem = await CrudTestModel.findOne('title', '==', 'Instance Create Test');
      expect(foundItem).not.toBeNull();
      expect(foundItem!.description).toBe('Created via instance method');
    }, EXTENDED_TIMEOUT);

    test('update() should update and save the instance', async () => {
      // Create initial data
      const model = new CrudTestModel();
      model.title = 'Instance Update Test';
      model.description = 'Original';
      model.isActive = false;
      await model.save();

      // Test instance update() method
      const updateData = {
        description: 'Updated via instance method',
        isActive: true
      };

      const result = await model.update(updateData);
      expect(result).toBe(model);
      expect(model.description).toBe('Updated via instance method');
      expect(model.isActive).toBe(true);

      // Verify changes were persisted
      const foundItem = await CrudTestModel.findOne('title', '==', 'Instance Update Test');
      expect(foundItem!.description).toBe('Updated via instance method');
      expect(foundItem!.isActive).toBe(true);
    }, EXTENDED_TIMEOUT);

    test('update() should work without updateData parameter', async () => {
      // Create initial data
      const model = new CrudTestModel();
      model.title = 'Instance Update No Data';
      model.description = 'Original';
      await model.save();

      // Modify the instance directly
      model.description = 'Modified directly';

      // Test instance update() without parameters
      const result = await model.update();
      expect(result).toBe(model);

      // Verify changes were persisted
      const foundItem = await CrudTestModel.findOne('title', '==', 'Instance Update No Data');
      expect(foundItem!.description).toBe('Modified directly');
    }, EXTENDED_TIMEOUT);

    test('destroy() should be an alias for remove()', async () => {
      // Create test data
      const model = new CrudTestModel();
      model.title = 'Instance Destroy Test';
      model.description = 'To be destroyed';
      await model.save();

      // Test instance destroy() method
      const result = await model.destroy();
      expect(result).toBe(true);

      // Verify it was removed from database
      const foundItem = await CrudTestModel.findOne('title', '==', 'Instance Destroy Test');
      expect(foundItem).toBeNull();
    }, EXTENDED_TIMEOUT);

    test('delete() should be an alias for remove()', async () => {
      // Create test data
      const model = new CrudTestModel();
      model.title = 'Instance Delete Test';
      model.description = 'To be deleted';
      await model.save();

      // Test instance delete() method
      const result = await model.delete();
      expect(result).toBe(true);

      // Verify it was removed from database
      const foundItem = await CrudTestModel.findOne('title', '==', 'Instance Delete Test');
      expect(foundItem).toBeNull();
    }, EXTENDED_TIMEOUT);

  });

  describe('Alias Methods Integration', () => {

    test('should work seamlessly with existing methods', async () => {
      // Create data using alias
      const createdItem = await CrudTestModel.create({
        title: 'Integration Test',
        description: 'Created with alias'
      });

      // Find using existing method
      const foundWithExisting = await CrudTestModel.findOne('title', '==', 'Integration Test');
      expect(foundWithExisting).not.toBeNull();

      // Find using alias method
      const foundWithAlias = await CrudTestModel.first('title', '==', 'Integration Test');
      expect(foundWithAlias).not.toBeNull();

      // Both should return the same data
      expect(foundWithExisting!.getId()).toBe(foundWithAlias!.getId());
      expect(foundWithExisting!.description).toBe(foundWithAlias!.description);

      // Update using instance alias
      await foundWithAlias!.update({
        description: 'Updated with alias'
      });

      // Verify using existing method
      const verifyItem = await CrudTestModel.findOne('title', '==', 'Integration Test');
      expect(verifyItem!.description).toBe('Updated with alias');

      // Clean up using alias
      await verifyItem!.destroy();
      
      // Verify deletion
      const deletedItem = await CrudTestModel.findOne('title', '==', 'Integration Test');
      expect(deletedItem).toBeNull();
    }, EXTENDED_TIMEOUT);

  });

});