import { initializeTestEnvironment, EXTENDED_TIMEOUT } from "../test-utils";
import { PathParamTestModel } from "../models/test-models";

// Initialize Firebase for tests
let testEnv: any;

beforeAll(() => {
  // Initialize Firebase and ORM with test utilities
  testEnv = initializeTestEnvironment();
});

describe('Static initPath Method (Alias for initPathParams)', () => {
  test('should create instance with single path parameter', () => {
    const instance = PathParamTestModel.initPath({
      userId: 'user123'
    });
    
    expect(instance).toBeDefined();
    expect(instance instanceof PathParamTestModel).toBe(true);
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
  });

  test('should create instance with multiple path parameters', () => {
    const instance = PathParamTestModel.initPath({
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
    comment1.setPathParams('userId', 'user555');
    comment1.setPathParams('postId', 'post777');
    comment1.content = 'Test content for initPath';
    comment1.author = 'Alice';
    await comment1.save();

    const comment2 = new PathParamTestModel();
    comment2.setPathParams('userId', 'user555');
    comment2.setPathParams('postId', 'post777');
    comment2.content = 'Another test content';
    comment2.author = 'Bob';
    await comment2.save();

    // Use the new initPath method with query chaining
    const instance = PathParamTestModel.initPath({
      userId: 'user555',
      postId: 'post777'
    });
    
    const results = await instance.query().where('author', '==', 'Alice').get();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    
    const found = results.find((c: any) => c.author === 'Alice' && c.content === 'Test content for initPath');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with getAll()', async () => {
    // Create test data
    const comment1 = new PathParamTestModel();
    comment1.setPathParams('userId', 'user666');
    comment1.setPathParams('postId', 'post888');
    comment1.content = 'First initPath comment';
    comment1.author = 'Charlie';
    await comment1.save();

    const comment2 = new PathParamTestModel();
    comment2.setPathParams('userId', 'user666');
    comment2.setPathParams('postId', 'post888');
    comment2.content = 'Second initPath comment';
    comment2.author = 'David';
    await comment2.save();

    // Use the initPath method with getAll()
    const results = await PathParamTestModel.initPath({
      userId: 'user666',
      postId: 'post888'
    }).getAll();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with query()', async () => {
    // Create test data
    const comment = new PathParamTestModel();
    comment.setPathParams('userId', 'user999');
    comment.setPathParams('postId', 'post111');
    comment.content = 'Query test with initPath';
    comment.author = 'Eve';
    await comment.save();

    // Use the initPath method with query()
    const query = PathParamTestModel.initPath({
      userId: 'user999',
      postId: 'post111'
    }).query().where('author', '==', 'Eve');
    
    expect(query).toBeDefined();
    
    const results = await query.get();
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    const found = results.find((c: any) => c.author === 'Eve' && c.content === 'Query test with initPath');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should be equivalent to initPathParams', () => {
    // Using initPath
    const instance1 = PathParamTestModel.initPath({
      userId: 'user777',
      postId: 'post999'
    });
    
    // Using initPathParams
    const instance2 = PathParamTestModel.initPathParams({
      userId: 'user777',
      postId: 'post999'
    });
    
    // Both should have the same path parameters
    const params1 = instance1.getPathParams();
    const params2 = instance2.getPathParams();
    
    expect(params1.get('userId')).toBe(params2.get('userId'));
    expect(params1.get('postId')).toBe(params2.get('postId'));
    expect(params1.size).toBe(params2.size);
  });

  test('should work with empty parameters object', () => {
    const instance = PathParamTestModel.initPath({});
    
    expect(instance).toBeDefined();
    expect(instance instanceof PathParamTestModel).toBe(true);
    
    const pathParams = instance.getPathParams();
    expect(pathParams.size).toBe(0);
  });

  test('should handle various value types', () => {
    const instance = PathParamTestModel.initPath({
      userId: 'user123',
      postId: 123,  // number
      extraParam: true  // boolean
    });
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user123');
    expect(pathParams.get('postId')).toBe(123);
    expect(pathParams.get('extraParam')).toBe(true);
  });

  test('should allow further modification after initialization', () => {
    const instance = PathParamTestModel.initPath({
      userId: 'user321'
    });
    
    // Should be able to add more path params after initialization
    instance.setPathParams('postId', 'post654');
    
    const pathParams = instance.getPathParams();
    expect(pathParams.get('userId')).toBe('user321');
    expect(pathParams.get('postId')).toBe('post654');
    expect(pathParams.size).toBe(2);
  });

  test('should allow setting model properties after initialization', () => {
    const instance = PathParamTestModel.initPath({
      userId: 'user456',
      postId: 'post789'
    });
    
    // Should be able to set model properties
    instance.content = 'Content via initPath';
    instance.author = 'Author via initPath';
    
    expect(instance.content).toBe('Content via initPath');
    expect(instance.author).toBe('Author via initPath');
  });

  test('should work with instance methods after initialization', () => {
    const instance = PathParamTestModel.initPath({
      userId: 'user147',
      postId: 'post258'
    });
    
    // Should be able to call instance methods
    const pathList = instance.getPathList();
    expect(pathList).toBeDefined();
    
    const pathListParams = instance.getPathListParams();
    expect(pathListParams).toBeDefined();
    expect(pathListParams.userId).toBe('user147');
    expect(pathListParams.postId).toBe('post258');
  });

  test('should allow chaining with where() instance method', async () => {
    // Create test data
    const comment1 = new PathParamTestModel();
    comment1.setPathParams('userId', 'user888');
    comment1.setPathParams('postId', 'post222');
    comment1.content = 'Where test content';
    comment1.author = 'Frank';
    await comment1.save();

    // Use initPath with where() chaining
    const results = await PathParamTestModel.initPath({
      userId: 'user888',
      postId: 'post222'
    }).where('author', '==', 'Frank').get();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    
    const found = results.find((c: any) => c.author === 'Frank' && c.content === 'Where test content');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with find() instance method', async () => {
    // Create test data
    const comment = new PathParamTestModel();
    comment.setPathParams('userId', 'user444');
    comment.setPathParams('postId', 'post333');
    comment.content = 'Find test content';
    comment.author = 'Grace';
    await comment.save();

    // Use initPath with find() chaining
    const results = await PathParamTestModel.initPath({
      userId: 'user444',
      postId: 'post333'
    }).find('author', '==', 'Grace');
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    
    const found = results.find((c: any) => c.author === 'Grace' && c.content === 'Find test content');
    expect(found).toBeDefined();
  }, EXTENDED_TIMEOUT);

  test('should allow chaining with findOne() instance method', async () => {
    // Create test data
    const comment = new PathParamTestModel();
    comment.setPathParams('userId', 'user777');
    comment.setPathParams('postId', 'post444');
    comment.content = 'FindOne test content';
    comment.author = 'Henry';
    await comment.save();

    // Use initPath with findOne() chaining
    const result = await PathParamTestModel.initPath({
      userId: 'user777',
      postId: 'post444'
    }).findOne('author', '==', 'Henry');
    
    expect(result).toBeDefined();
    expect(result?.author).toBe('Henry');
    expect(result?.content).toBe('FindOne test content');
  }, EXTENDED_TIMEOUT);
});
