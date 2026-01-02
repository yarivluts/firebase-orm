# Firebase ORM - Bug Fixes Demonstration

This document demonstrates the fixes implemented for the reported issues.

## Issue 1: Static Methods Now Work Correctly

### Problem
Static methods like `Post.getAll()` and `Post.query()` were failing in some bundler configurations (Next.js/RSC) because the internal instance check was too strict.

### Solution
The library's static methods now properly set internal flags so they work reliably across all environments.

### Correct Usage:
```typescript
// Static methods (recommended and working)
const items = await Item.getAll();
const posts = await Post.query().where('status', '==', 'active').get();

// Static factory with path params
const posts = await Post.initPath({ user_id: userId }).getAll();
```

### Note on Manual Instantiation
Manual instantiation with instance methods is intentionally NOT supported to maintain API consistency:
```typescript
// ✗ NOT SUPPORTED - will throw error
const post = new Post();
await post.getAll(); // ERROR!

// ✓ CORRECT - use static methods
const posts = await Post.getAll();
```

## Issue 2: setPathParams Now Supports Object-Based API

### Old API (still works):
```typescript
const post = Post.initPath({ user_id: userId });
post.setPathParams('category_id', categoryId);
```

### New Object-Based API:
```typescript
const post = Post.initPath({ user_id: userId });
post.setPathParams({ category_id: categoryId, tag_id: tagId });

// Or chain them:
post.setPathParams({ category_id: categoryId })
    .setPathParams({ tag_id: tagId });
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
// Ensure the model is properly imported as a class reference
```

## Backward Compatibility

All changes are backward compatible:
- Old `setPathParams(key, value)` syntax still works
- Static methods continue to work as before
- Existing error handling is preserved
- All existing APIs remain unchanged

## Migration Guide

No migration required! All new features are additive:

1. Continue using static methods (recommended pattern)
2. Optionally adopt the new object-based `setPathParams` API
3. Better error messages appear automatically

## Best Practices

### For simple models (no path params):
```typescript
// Static method (recommended)
const items = await Item.getAll();
const item = await Item.findOne('id', '==', itemId);
```

### For models with path parameters:
```typescript
// Static factory (recommended - most ergonomic)
const posts = await Post.initPath({ user_id: userId }).getAll();

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

