import { initializeTestEnvironment, cleanupCollection, EXTENDED_TIMEOUT } from "../test-utils";
import { PathParamTestModel } from "../models/test-models";

// Initialize Firebase for tests
let testEnv: any;

beforeAll(() => {
  // Initialize Firebase and ORM with test utilities
  testEnv = initializeTestEnvironment();
});

describe('Nested Model Init with Path Parameters', () => {
  test('should initialize nested model with path parameters using init()', async () => {
    // Create a nested model using constructor
    const comment = new PathParamTestModel();
    comment.setPathParams('userId', 'user123');
    comment.setPathParams('postId', 'post456');
    comment.content = 'Great post!';
    comment.author = 'John Doe';
    await comment.save();
    
    const commentId = comment.getId();
    
    // Load using the simplified init pattern with path parameters
    const loadedComment = await PathParamTestModel.init(commentId, {
      userId: 'user123',
      postId: 'post456'
    });
    
    // Verify the comment was loaded correctly
    expect(loadedComment).toBeDefined();
    expect(loadedComment?.content).toBe('Great post!');
    expect(loadedComment?.author).toBe('John Doe');
    expect(loadedComment?.getId()).toBe(commentId);
  }, EXTENDED_TIMEOUT);

  test('should return null for nested model with non-existent ID', async () => {
    // Try to load a non-existent nested model
    const nonExistent = await PathParamTestModel.init('non-existent-comment', {
      userId: 'user123',
      postId: 'post456'
    });
    
    // Should return null
    expect(nonExistent).toBeNull();
  }, EXTENDED_TIMEOUT);

  test('should create nested model using constructor and setPathParams', async () => {
    // Create a new nested model
    const newComment = new PathParamTestModel();
    newComment.setPathParams('userId', 'user789');
    newComment.setPathParams('postId', 'post101');
    newComment.content = 'Another comment';
    newComment.author = 'Jane Smith';
    
    await newComment.save();
    
    // Verify it was saved
    expect(newComment.getId()).toBeDefined();
    
    // Load it back using init
    const reloaded = await PathParamTestModel.init(newComment.getId(), {
      userId: 'user789',
      postId: 'post101'
    });
    
    expect(reloaded?.content).toBe('Another comment');
    expect(reloaded?.author).toBe('Jane Smith');
  }, EXTENDED_TIMEOUT);

  test('should support method chaining with setPathParams', async () => {
    // Create with chained setPathParams
    const comment = new PathParamTestModel();
    comment
      .setPathParams('userId', 'user999')
      .setPathParams('postId', 'post888');
    
    comment.content = 'Chained params test';
    comment.author = 'Test User';
    await comment.save();
    
    // Verify path params were set
    const pathParams = comment.getPathParams();
    expect(pathParams.get('userId')).toBe('user999');
    expect(pathParams.get('postId')).toBe('post888');
    
    // Load using init
    const loaded = await PathParamTestModel.init(comment.getId(), {
      userId: 'user999',
      postId: 'post888'
    });
    
    expect(loaded?.content).toBe('Chained params test');
  }, EXTENDED_TIMEOUT);
});
