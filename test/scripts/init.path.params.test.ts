import { initializeTestEnvironment, EXTENDED_TIMEOUT } from "../test-utils";
import { PathParamTestModel } from "../models/test-models";

// Initialize Firebase for tests
let testEnv: any;

beforeAll(() => {
  // Initialize Firebase and ORM with test utilities
  testEnv = initializeTestEnvironment();
});

describe('Static initPathParams Method', () => {
  test('should create instance with single path parameter', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123'
    });
    
    expect(instance).toBeDefined();
    expect(instance instanceof PathParamTestModel).toBe(true);
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
  });

  test('should create instance with multiple path parameters', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123',
      postId: 'post456'
    });
    
    expect(instance).toBeDefined();
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe('post456');
  });

  test('should allow chaining with query and where clause', async () => {
    // First create some test data
    const comment1 = new PathParamTestModel();
    comment1.setPathParams('userId', 'user123');
    comment1.setPathParams('postId', 'post789');
    comment1.content = 'Active comment';
    comment1.author = 'John Doe';
    await comment1.save();

    const comment2 = new PathParamTestModel();
    comment2.setPathParams('userId', 'user123');
    comment2.setPathParams('postId', 'post789');
    comment2.content = 'Another comment';
    comment2.author = 'Jane Smith';
    await comment2.save();

    // Use the new static method with query chaining
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123',
      postId: 'post789'
    });
    
    const results = await instance.query().where('author', '==', 'John Doe').get();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    
    const found = results.find((c: any) => c.author === 'John Doe' && c.content === 'Active comment');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with getAll()', async () => {
    // Create test data
    const comment1 = new PathParamTestModel();
    comment1.setPathParams('userId', 'user456');
    comment1.setPathParams('postId', 'post101');
    comment1.content = 'First comment';
    comment1.author = 'Alice';
    await comment1.save();

    const comment2 = new PathParamTestModel();
    comment2.setPathParams('userId', 'user456');
    comment2.setPathParams('postId', 'post101');
    comment2.content = 'Second comment';
    comment2.author = 'Bob';
    await comment2.save();

    // Use the new static method with getAll()
    const results = await PathParamTestModel.initPathParams({
      userId: 'user456',
      postId: 'post101'
    }).getAll();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with query()', async () => {
    // Create test data
    const comment = new PathParamTestModel();
    comment.setPathParams('userId', 'user789');
    comment.setPathParams('postId', 'post202');
    comment.content = 'Query test comment';
    comment.author = 'Charlie';
    await comment.save();

    // Use the new static method with query()
    const query = PathParamTestModel.initPathParams({
      userId: 'user789',
      postId: 'post202'
    }).query().where('author', '==', 'Charlie');
    
    expect(query).toBeDefined();
    
    const results = await query.get();
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    const found = results.find((c: any) => c.author === 'Charlie' && c.content === 'Query test comment');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should work with empty parameters object', () => {
    const instance = PathParamTestModel.initPathParams({});
    
    expect(instance).toBeDefined();
    expect(instance instanceof PathParamTestModel).toBe(true);
    
    const pathParams = instance.getPathParams();
    expect(pathParams.size).toBe(0);
  });

  test('should handle various value types', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123',
      postId: 123,  // number
      extraParam: true  // boolean
    });
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe(123);
    expect(pathParams.get('extraParam')).toBe(true);
  });

  test('should be equivalent to manual setPathParams chaining', () => {
    // Using the new static method
    const instance1 = PathParamTestModel.initPathParams({
      userId: 'user999',
      postId: 'post888'
    });
    
    // Using the old manual chaining method
    const instance2 = new PathParamTestModel();
    instance2.setPathParams('userId', 'user999');
    instance2.setPathParams('postId', 'post888');
    
    // Both should have the same path parameters
    const params1 = instance1.getPathParams();
    const params2 = instance2.getPathParams();
    
    expect(params1.get('userId')).toBe(params2.get('userId'));
    expect(params1.get('postId')).toBe(params2.get('postId'));
    expect(params1.size).toBe(params2.size);
  });

  test('should allow further modification after initialization', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123'
    });
    
    // Should be able to add more path params after initialization
    instance.setPathParams('postId', 'post456');
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe('post456');
    expect(pathParams.size).toBe(2);
  });

  test('should allow setting model properties after initialization', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123',
      postId: 'post456'
    });
    
    // Should be able to set model properties
    instance.content = 'Test content';
    instance.author = 'Test Author';
    
    expect(instance.content).toBe('Test content');
    expect(instance.author).toBe('Test Author');
  });

  test('should work with instance methods after initialization', () => {
    const instance = PathParamTestModel.initPathParams({
      userId: 'user123',
      postId: 'post456'
    });
    
    // Should be able to call instance methods
    const pathList = instance.getPathList();
    expect(pathList).toBeDefined();
    
    const pathListParams = instance.getPathListParams();
    expect(pathListParams).toBeDefined();
    expect(pathListParams.userId).toBe('user123');
    expect(pathListParams.postId).toBe('post456');
  });
});
