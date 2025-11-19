import { TestModel, PathParamTestModel } from "../models/test-models";

describe('Instance Query Method Restrictions', () => {
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
    
    // This should work because it's marked as created via getModel
    const query = parentModel.query();
    expect(query).toBeDefined();
  });

  test('should preserve _createdViaGetModel flag when getting current model', () => {
    // Create a parent model marked as created via getModel
    const parentModel = new TestModel();
    parentModel['_createdViaGetModel'] = true;
    
    // getCurrentModel should preserve the flag
    const currentModel = parentModel.getCurrentModel();
    expect(currentModel['_createdViaGetModel']).toBe(true);
    
    // And should allow query methods
    const query = currentModel.query();
    expect(query).toBeDefined();
  });
});
