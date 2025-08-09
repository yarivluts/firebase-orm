# Fix for "collection is not a function" Error

## Problem
The error "TypeError: collection is not a function" occurred when using Firebase Client SDK because repository methods were called before the async initialization completed.

## Root Cause
- Firebase Client SDK requires async import of functions like `collection`, `doc`, etc.
- Repository methods were being called before these functions were properly initialized
- The `collection` variable was still undefined when used

## Solution
Added proper async initialization handling with backward compatibility:

### For New Code (Recommended)
```javascript
// Properly initialize global connection and wait for it
await FirestoreOrmRepository.initGlobalConnection(firestore);

// Now models can be used safely
const post = new Post();
await post.save();
```

### For Existing Code
The fix maintains backward compatibility but adds better error messages:

```javascript
// If setup is not complete, you'll get a clear error instead of "collection is not a function"
try {
    const post = new Post();
    await post.save(); // This will work if setup is complete
} catch (error) {
    // Now you get: "Firebase functions not initialized. Repository setup is not complete. 
    // Use async methods or ensure initGlobalConnection is awaited."
    console.log(error.message);
}
```

### Direct Repository Usage
```javascript
const repo = new FirestoreOrmRepository(firestore);

// Wait for setup to complete  
await repo.setupPromise;

// Now repository can be used safely
const model = repo.getModel(MyModel);
await model.save();
```

## Key Changes
1. **Added async initialization checking**: Methods now wait for setup or provide clear errors
2. **Maintained backward compatibility**: Existing synchronous methods still work
3. **Added async alternatives**: New `*Async` methods for proper async handling
4. **Better error messages**: Clear guidance instead of confusing "collection is not a function"

## Admin SDK vs Client SDK
- **Admin SDK**: Works immediately (synchronous setup) - no changes needed
- **Client SDK**: Requires proper async initialization - follow examples above

The fix ensures your code works correctly regardless of which Firebase SDK you're using.