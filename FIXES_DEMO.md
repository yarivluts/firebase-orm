# Firebase ORM - Bug Fixes Demonstration

This document demonstrates the fixes implemented for the reported issues.

## Issue 1: Instance Query Methods Now Work on Manual Instantiation

### Before (would throw error):
```typescript
const user = new User();
await user.getAll(); // ERROR: Instance query methods can only be called on models retrieved via getModel()
```

### After (works correctly):
```typescript
const user = new User();
await user.getAll(); // ✓ Works! Auto-configures on first call
```

## Issue 2: setPathParams Now Supports Object-Based API

### Old API (still works):
```typescript
const post = new Post();
post.setPathParams('user_id', userId);
post.setPathParams('post_id', postId);
```

### New Object-Based API:
```typescript
const post = new Post();
post.setPathParams({ user_id: userId, post_id: postId });

// Or chain them:
post.setPathParams({ user_id: userId })
    .setPathParams({ post_id: postId });
```

### Using Static Factory (recommended):
```typescript
// Most ergonomic approach
const posts = await Post.initPath({ user_id: userId }).getAll();

// Or with query chaining
const activePosts = await Post.initPath({ user_id: userId })
    .where('status', '==', 'active')
    .get();
```

## Issue 3: Better Error Messages

### Before:
```
Error: users/:user_id/posts/:post_id - user_id is missing!
```

### After:
```
Path parameter 'user_id' is required for model 'Post' but was not provided.
Reference path: users/:user_id/posts
Path ID: post_id

To fix this, set the path parameter using one of these methods:
1. model.setPathParams('user_id', value)
2. model.setPathParams({ user_id: value })
3. Model.initPath({ user_id: value })
```

## Issue 4: HMR Safety

The library now safely handles Hot Module Replacement scenarios:

```typescript
// First initialization
FirestoreOrmRepository.initGlobalConnection(firestore);

// HMR reload - same instance
FirestoreOrmRepository.initGlobalConnection(firestore); // ✓ Safely reuses existing

// Different instance (config change)
FirestoreOrmRepository.initGlobalConnection(newFirestore); 
// ⚠️ Logs warning but allows re-initialization
```

## Issue 5: Robust Model Instantiation

Better error handling for subcollections and invalid model references:

```typescript
// Invalid model constructor
repository.getModel(null); 
// Error: getModel requires a valid model constructor...
// This can happen if the model class reference is lost during serialization

repository.getModel(undefined);
// Error: getModel requires a valid model constructor...
// Ensure the model is properly imported and not destructured
```

## Backward Compatibility

All changes are backward compatible:
- Old `setPathParams(key, value)` syntax still works
- Static methods continue to work as before
- Existing error handling is preserved
- All existing APIs remain unchanged

## Migration Guide

No migration required! All new features are additive:

1. You can continue using existing patterns
2. Optionally adopt the new object-based `setPathParams` API
3. Optionally use manual instantiation if it fits your use case better
4. Better error messages appear automatically

## Best Practices

### For simple models (no path params):
```typescript
// Static method (recommended)
const items = await Item.getAll();

// Or manual instantiation (now works)
const item = new Item();
const items = await item.getAll();
```

### For models with path parameters:
```typescript
// Static factory (recommended - most ergonomic)
const posts = await Post.initPath({ user_id: userId }).getAll();

// Or manual with setPathParams
const post = new Post();
post.setPathParams({ user_id: userId });
const posts = await post.getAll();

// Or via parent model (original pattern)
const user = await User.findOne('id', '==', userId);
const posts = await user.getModel(Post).getAll();
```

### For queries with path parameters:
```typescript
// Clean and ergonomic
const recentPosts = await Post.initPath({ user_id: userId })
    .where('created_at', '>', timestamp)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();
```
