import { initializeTestEnvironment, EXTENDED_TIMEOUT } from "../test-utils";
import { TestModel, PathParamTestModel } from "../models/test-models";

// Initialize Firebase for tests
let testEnv: any;

beforeAll(() => {
  // Initialize Firebase and ORM with test utilities
  testEnv = initializeTestEnvironment();
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
    
    const data = model.getData() as any;
    
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

describe('BaseModel Path Parameters Functionality', () => {
  test('setPathParams should store path parameters in Map', () => {
    const model = new PathParamTestModel();
    
    // Set path parameters using the new function
    model.setPathParams('userId', 'user123');
    model.setPathParams('postId', 'post456');
    
    // Verify the parameters are stored in the Map
    const pathParams = model.getPathParams();
    expect(pathParams.has('userId')).toBe(true);
    expect(pathParams.has('postId')).toBe(true);
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe('post456');
  });

  test('setPathParams should return the model instance for chaining', () => {
    const model = new PathParamTestModel();
    
    // Test method chaining
    const result = model.setPathParams('userId', 'user123').setPathParams('postId', 'post456');
    
    expect(result).toBe(model);
    const pathParams = model.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe('post456');
  });

  test('getPathListParams should prioritize pathParams over instance properties', () => {
    const model = new PathParamTestModel();
    
    // Set instance properties first
    model.userId = 'instanceUser123';
    model.postId = 'instancePost456';
    
    // Override with pathParams
    model.setPathParams('userId', 'paramUser999');
    model.setPathParams('postId', 'paramPost888');
    
    const pathParams = model.getPathListParams();
    
    // Should use pathParams values, not instance property values
    expect(pathParams.userId).toBe('paramUser999');
    expect(pathParams.postId).toBe('paramPost888');
  });

  test('getPathListParams should fallback to instance properties when pathParams not set', () => {
    const model = new PathParamTestModel();
    
    // Set only instance properties
    model.userId = 'instanceUser123';
    model.postId = 'instancePost456';
    
    const pathParams = model.getPathListParams();
    
    // Should use instance property values
    expect(pathParams.userId).toBe('instanceUser123');
    expect(pathParams.postId).toBe('instancePost456');
  });

  test('getPathList should prioritize pathParams over instance properties', () => {
    const model = new PathParamTestModel();
    
    // Set instance properties first
    model.userId = 'instanceUser123';
    model.postId = 'instancePost456';
    
    // Override with pathParams
    model.setPathParams('userId', 'paramUser999');
    model.setPathParams('postId', 'paramPost888');
    
    const pathList = model.getPathList();
    
    // Verify pathList structure and values
    expect(Array.isArray(pathList)).toBe(true);
    if (Array.isArray(pathList)) {
      // Check that the path list contains our pathParams values
      const pathValues = pathList.map(item => item.value);
      expect(pathValues).toContain('paramUser999');
      expect(pathValues).toContain('paramPost888');
      expect(pathValues).toContain('comments');
    }
  });
});