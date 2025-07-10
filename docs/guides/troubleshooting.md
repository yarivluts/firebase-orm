# Troubleshooting

This guide helps you diagnose and resolve common issues when working with Firebase ORM.

## Connection Issues

### Firebase Connection Problems

#### Problem: "Firebase app not initialized"
```
Error: Firebase app not initialized
```

**Solution:**
```typescript
// Ensure Firebase is initialized before using Firebase ORM
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
FirestoreOrmRepository.initGlobalConnection(firestore);
```

#### Problem: "Permission denied" errors
```
Error: Missing or insufficient permissions
```

**Solutions:**
1. **Check Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

2. **Verify Authentication:**
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
if (!auth.currentUser) {
  // User is not authenticated
  console.error('User must be authenticated');
}
```

3. **Check Admin SDK Setup (Server-side):**
```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project.firebaseio.com'
  });
}
```

### Network and Connectivity Issues

#### Problem: "Network request failed"
```
Error: Failed to get document because the client is offline
```

**Solution:**
```typescript
// Enable offline persistence
import { enableNetwork, disableNetwork } from 'firebase/firestore';

try {
  await enableNetwork(firestore);
  // Retry the operation
} catch (error) {
  console.error('Network error:', error);
  // Handle offline mode
}
```

#### Problem: Timeout errors
```
Error: Deadline exceeded
```

**Solution:**
```typescript
// Implement retry logic with exponential backoff
class RetryService {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Usage
const user = await RetryService.withRetry(async () => {
  const u = new User();
  await u.load('user-id');
  return u;
});
```

## Model and Data Issues

### Model Definition Problems

#### Problem: "Model not found" or "Reference path not defined"
```
Error: Model reference path not defined
```

**Solution:**
```typescript
// Ensure model is properly decorated
@Model({
  reference_path: "users",  // Required
  path_id: "user_id"        // Required
})
export class User extends BaseModel {
  // Model fields...
}
```

#### Problem: Fields not saving to database
```
// Data is not persisted
```

**Solution:**
```typescript
// Ensure fields are decorated with @Field
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })  // Required decorator
  public name!: string;
  
  // This field won't be saved (no @Field decorator)
  public tempData: string;
}
```

#### Problem: TypeScript strict mode errors
```
Error: Property 'name' has no initializer and is not definitely assigned
```

**Solution:**
```typescript
// Option 1: Use definite assignment assertion
@Field({ is_required: true })
public name!: string;  // Note the exclamation mark

// Option 2: Initialize with default value
@Field({ is_required: false })
public name: string = '';

// Option 3: Update tsconfig.json
{
  "compilerOptions": {
    "strictPropertyInitialization": false
  }
}
```

### Data Validation Issues

#### Problem: Invalid data types
```
Error: Invalid data type for field
```

**Solution:**
```typescript
// Implement validation in beforeSave
export class User extends BaseModel {
  @Field({ is_required: true })
  public age!: number;

  async beforeSave(): Promise<void> {
    // Validate age is a number
    if (typeof this.age !== 'number' || this.age < 0) {
      throw new Error('Age must be a positive number');
    }
  }
}
```

#### Problem: Date/timestamp issues
```
Error: Invalid timestamp format
```

**Solution:**
```typescript
// Consistent timestamp handling
export class BaseTimestampModel extends BaseModel {
  @Field({ field_name: "created_at" })
  public createdAt?: string;

  @Field({ field_name: "updated_at" })
  public updatedAt?: string;

  async beforeSave(): Promise<void> {
    const now = new Date().toISOString();
    
    if (!this.getId()) {
      this.createdAt = now;
    }
    this.updatedAt = now;
  }
}
```

## Query Issues

### Query Syntax Problems

#### Problem: "Invalid query" errors
```
Error: Invalid query. You have an inequality filter on 'price' but the first orderBy is on 'name'
```

**Solution:**
```typescript
// ❌ Wrong: orderBy field must match inequality filter
const products = await Product.query()
  .where('price', '>', 100)
  .orderBy('name', 'asc')  // This causes the error
  .get();

// ✅ Correct: orderBy the same field as inequality filter
const products = await Product.query()
  .where('price', '>', 100)
  .orderBy('price', 'asc')  // Now orderBy matches where clause
  .orderBy('name', 'asc')   // Additional orderBy is allowed
  .get();
```

#### Problem: "Missing index" errors
```
Error: The query requires an index
```

**Solution:**
1. **Create the index in Firebase Console:**
   - Go to Firebase Console > Firestore > Indexes
   - Click "Create Index"
   - Add the fields from your query

2. **Or use the provided link in the error:**
```typescript
// The error usually provides a direct link to create the index
// Click the link to automatically create the required index
```

3. **Test indexes locally:**
```typescript
// Use Firebase emulator for local testing
firebase emulators:start --only firestore
```

### Query Performance Issues

#### Problem: Slow queries
```
// Queries taking too long to execute
```

**Solution:**
```typescript
// Use proper indexing and query optimization
class OptimizedQueryService {
  // ✅ Good: Use specific queries with indexes
  static async getActiveProducts(category: string): Promise<Product[]> {
    return await Product.query()
      .where('category', '==', category)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
  }

  // ❌ Avoid: Loading all data then filtering
  static async getActiveProductsSlow(category: string): Promise<Product[]> {
    const allProducts = await Product.getAll();
    return allProducts.filter(p => p.category === category && p.isActive);
  }
}
```

#### Problem: Query result limits
```
Error: Query returned too many results
```

**Solution:**
```typescript
// Implement pagination
class PaginatedQueryService {
  static async getProductsPaginated(
    category: string,
    lastDoc?: Product,
    limit: number = 20
  ): Promise<Product[]> {
    let query = Product.query()
      .where('category', '==', category)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (lastDoc) {
      query = query.startAfter(lastDoc.createdAt);
    }

    return await query.get();
  }
}
```

## Relationship Issues

### Relationship Loading Problems

#### Problem: "Relationship not found"
```
Error: Relationship 'posts' not found on User model
```

**Solution:**
```typescript
// Ensure relationship is properly defined
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // Define the relationship with correct decorator
  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];  // Property name must match loadHasMany parameter
}

// Usage
const user = new User();
await user.load('user-id');
const posts = await user.loadHasMany('posts'); // Must match property name
```

#### Problem: Circular dependency errors
```
Error: Circular dependency detected
```

**Solution:**
```typescript
// Avoid circular imports
// user.model.ts
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;
}

// post.model.ts
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ field_name: "author_id" })
  public authorId!: string;
}

// relationships.ts - Define relationships separately
import { User } from './user.model';
import { Post } from './post.model';

// Add relationships after model definitions
Object.defineProperty(User.prototype, 'posts', {
  value: undefined,
  writable: true
});

// Add decorator metadata
Reflect.defineMetadata('hasMany', [
  { property: 'posts', model: Post, foreignKey: 'author_id' }
], User.prototype);
```

### Foreign Key Issues

#### Problem: Invalid foreign key references
```
Error: Referenced document does not exist
```

**Solution:**
```typescript
// Validate foreign keys before saving
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ field_name: "author_id" })
  public authorId!: string;

  async beforeSave(): Promise<void> {
    // Validate author exists
    if (this.authorId) {
      try {
        const author = new User();
        await author.load(this.authorId);
      } catch (error) {
        throw new Error(`Invalid author_id: ${this.authorId}`);
      }
    }
  }
}
```

## Storage Issues

### File Upload Problems

#### Problem: "Storage bucket not configured"
```
Error: Firebase Storage bucket not configured
```

**Solution:**
```typescript
// Initialize Firebase Storage
import { getStorage } from 'firebase/storage';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const storage = getStorage();
FirestoreOrmRepository.initGlobalStorage(storage);
```

#### Problem: "Upload failed" errors
```
Error: Upload failed with unknown error
```

**Solution:**
```typescript
// Implement proper error handling for uploads
class SafeStorageService {
  static async uploadFile(model: BaseModel, field: string, file: File): Promise<void> {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File too large');
      }

      // Upload with error handling
      await model.getStorageFile(field).uploadFile(file);
      await model.save();
    } catch (error) {
      if (error.code === 'storage/unauthorized') {
        throw new Error('Not authorized to upload files');
      } else if (error.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded');
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
  }
}
```

## Memory and Performance Issues

### Memory Leaks

#### Problem: Memory usage keeps growing
```
// Memory usage increases over time
```

**Solution:**
```typescript
// Implement proper cleanup
class MemoryEfficientService {
  private subscriptions: (() => void)[] = [];

  subscribeToUsers(): void {
    const unsubscribe = User.onList((users) => {
      // Handle users
    });
    
    this.subscriptions.push(unsubscribe);
  }

  cleanup(): void {
    // Unsubscribe from all listeners
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }
}

// React component example
useEffect(() => {
  const unsubscribe = User.onList((users) => {
    setUsers(users);
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

### Performance Bottlenecks

#### Problem: Slow application performance
```
// App becomes slow with many models
```

**Solution:**
```typescript
// Implement lazy loading and caching
class PerformantModelService {
  private static cache = new Map<string, any>();

  static async getUser(id: string): Promise<User> {
    // Check cache first
    const cacheKey = `user_${id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Load from database
    const user = new User();
    await user.load(id);
    
    // Cache the result
    this.cache.set(cacheKey, user);
    
    return user;
  }

  static invalidateCache(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Debugging Tools

### Enable Debug Mode

```typescript
// Enable debug logging
FirestoreOrmRepository.enableDebugMode();

// Custom debug logging
class DebugService {
  static log(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Firebase ORM Debug] ${message}`, data);
    }
  }
}
```

### Query Analysis

```typescript
// Analyze query performance
class QueryAnalyzer {
  static async analyzeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - start;
      
      console.log(`Query ${queryName} took ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Query ${queryName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}

// Usage
const users = await QueryAnalyzer.analyzeQuery(
  'getActiveUsers',
  () => User.query().where('isActive', '==', true).get()
);
```

## Common Error Messages and Solutions

### "Cannot read property 'getId' of undefined"
```typescript
// ❌ Problem: Model not loaded
const user = new User();
console.log(user.getId()); // undefined

// ✅ Solution: Load model first
const user = new User();
await user.load('user-id');
console.log(user.getId()); // Works
```

### "Document not found"
```typescript
// ❌ Problem: No error handling
const user = new User();
await user.load('non-existent-id');

// ✅ Solution: Handle missing documents
try {
  const user = new User();
  await user.load('user-id');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('User not found');
  }
}
```

### "Invalid field path"
```typescript
// ❌ Problem: Invalid field name
const users = await User.query().where('invalid-field', '==', 'value').get();

// ✅ Solution: Use correct field names
const users = await User.query().where('validField', '==', 'value').get();
```

## Getting Help

### Check Documentation
- Review the [Firebase ORM documentation](../README.md)
- Check [Firebase documentation](https://firebase.google.com/docs)
- Look at [code examples](../examples/)

### Debug Information
When reporting issues, include:
- Firebase ORM version
- Firebase SDK version
- Node.js/browser version
- Complete error message
- Minimal reproduction code

### Community Support
- GitHub Issues: Report bugs and feature requests
- Stack Overflow: Use tags `firebase-orm`, `firestore`
- Firebase Community: Join Firebase community discussions

### Performance Monitoring
```typescript
// Monitor application performance
class PerformanceMonitor {
  static startMonitoring(): void {
    // Monitor query performance
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        console.log('Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    }, 30000); // Check every 30 seconds
  }
}
```

Remember to always test your solutions in a development environment before applying them to production!