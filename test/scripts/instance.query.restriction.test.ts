import { FirestoreOrmRepository } from "../../repository";
import { TestModel, PathParamTestModel } from "../models/test-models";

describe('Instance Query Method Restrictions', () => {
  let mockFirestore: any;

  beforeEach(() => {
    // Mock Firestore for testing
    mockFirestore = {
      collection: jest.fn((path) => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [], empty: true })
      })),
      doc: jest.fn((path) => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) })
      })),
      _settings: { projectId: 'test-project' }
    };

    // Initialize repository with mocked Firestore
    FirestoreOrmRepository.initGlobalConnection(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw error when calling where() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.where('someField', '==', 'value');
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should throw error when calling query() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.query();
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should throw error when calling getAll() on directly instantiated model', async () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    model.setPathParams('postId', 'post456');
    
    await expect(model.getAll()).rejects.toThrow(
      /Instance query methods.*can only be called on models retrieved via getModel/
    );
  });

  test('should throw error when calling find() on directly instantiated model', async () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    await expect(model.find('someField', '==', 'value')).rejects.toThrow(
      /Instance query methods.*can only be called on models retrieved via getModel/
    );
  });

  test('should throw error when calling findOne() on directly instantiated model', async () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    await expect(model.findOne('someField', '==', 'value')).rejects.toThrow(
      /Instance query methods.*can only be called on models retrieved via getModel/
    );
  });

  test('should throw error when calling onList() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.onList(() => {});
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should throw error when calling onAllList() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.onAllList(() => {});
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should throw error when calling onCreatedList() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.onCreatedList(() => {});
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should throw error when calling onUpdatedList() on directly instantiated model', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    expect(() => {
      model.onUpdatedList(() => {});
    }).toThrow(/Instance query methods.*can only be called on models retrieved via getModel/);
  });

  test('should allow static methods to work normally', () => {
    // Static methods should work without any errors
    const query = TestModel.query();
    expect(query).toBeDefined();
    
    const whereQuery = TestModel.where('someField', '==', 'value');
    expect(whereQuery).toBeDefined();
  });

  test('should allow instance methods when model is created via getModel()', () => {
    // Create a parent model
    const parentModel = new TestModel();
    parentModel['_createdViaGetModel'] = true; // Simulate getModel creation
    parentModel.setModelType(TestModel); // Set model type for getCurrentModel to work
    
    // This should work because it's marked as created via getModel
    const query = parentModel.query();
    expect(query).toBeDefined();
  });

  test('should preserve _createdViaGetModel flag when getting current model', () => {
    // Create a parent model marked as created via getModel
    const parentModel = new TestModel();
    parentModel['_createdViaGetModel'] = true;
    parentModel.setModelType(TestModel); // Set model type for getCurrentModel to work
    
    // getCurrentModel should preserve the flag
    const currentModel = parentModel.getCurrentModel();
    expect(currentModel['_createdViaGetModel']).toBe(true);
    
    // And should allow query methods
    const query = currentModel.query();
    expect(query).toBeDefined();
  });

  test('error message should include helpful examples and all valid patterns', () => {
    const model = new PathParamTestModel();
    model.setPathParams('userId', 'user123');
    
    try {
      model.where('someField', '==', 'value');
      fail('Expected error to be thrown');
    } catch (error) {
      const errorMessage = error.message;
      
      // Should explicitly mention calling instance method
      expect(errorMessage).toContain('INSTANCE method');
      expect(errorMessage).toContain('static methods are available');
      
      // Should mention all valid patterns
      expect(errorMessage).toContain('Static methods on the CLASS');
      expect(errorMessage).toContain('Via parent');
      expect(errorMessage).toContain('With path params');
      
      // Should include examples with generic model names
      expect(errorMessage).toContain('YourModel.getAll()');
      expect(errorMessage).toContain('parentModel.getModel(ChildModel)');
      expect(errorMessage).toContain('initPath');
      
      // Should show common mistakes
      expect(errorMessage).toContain('Common mistakes');
      expect(errorMessage).toContain('✓');
      expect(errorMessage).toContain('✗');
      
      // Should specifically address the "pass CLASS not instance" confusion
      expect(errorMessage).toContain('pass CLASS not instance');
    }
  });
});
