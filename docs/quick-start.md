# Quick Start Guide

Get up and running with Firebase ORM in minutes. This guide will walk you through creating your first model and performing basic operations.

## Prerequisites

Before you begin, make sure you have:
- Node.js 14 or higher installed
- A Firebase project with Firestore enabled
- Basic knowledge of TypeScript/JavaScript

## Installation

Install Firebase ORM and its dependencies:

```bash
npm install @arbel/firebase-orm firebase moment --save
```

For server-side applications:
```bash
npm install @arbel/firebase-orm firebase-admin moment --save
```

## Basic Configuration

### 1. Initialize Firebase

Create a Firebase configuration file:

```typescript
// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Firebase ORM
FirestoreOrmRepository.initGlobalConnection(firestore);
```

### 2. TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

## Your First Model

Let's create a simple User model:

```typescript
// models/User.ts
import { BaseModel, Model, Field } from '@arbel/firebase-orm';

@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ is_required: false })
  public bio?: string;

  // Helper method
  getDisplayName(): string {
    return this.name || this.email;
  }
}
```

## Basic Operations

### Creating Records

```typescript
// Create a new user
const user = new User();
user.name = 'John Doe';
user.email = 'john@example.com';
user.bio = 'Software developer';
user.createdAt = new Date().toISOString();

// Save to Firestore
await user.save();

console.log('User created with ID:', user.getId());
```

### Reading Records

```typescript
// Get all users
const allUsers = await User.getAll();
console.log('All users:', allUsers);

// Get a specific user by ID - SIMPLIFIED PATTERN ⚡
const specificUser = await User.init('user-id-here');
if (specificUser) {
  console.log('User:', specificUser.name);
} else {
  console.log('User not found');
}

// Alternative traditional pattern (still supported)
const traditionalUser = new User();
await traditionalUser.load('user-id-here');
console.log('User:', traditionalUser.name);

// Find users with conditions
const johnUsers = await User.query()
  .where('name', '==', 'John Doe')
  .get();

console.log('Users named John:', johnUsers);
```

### Updating Records

```typescript
// Load an existing user - SIMPLIFIED PATTERN ⚡
const user = await User.init('user-id-here');

if (user) {
  // Update properties
  user.name = 'John Smith';
  user.bio = 'Senior Software Developer';

  // Save changes
  await user.save();

  console.log('User updated!');
}
```

### Deleting Records

```typescript
// Load and delete a user - SIMPLIFIED PATTERN ⚡
const user = await User.init('user-id-here');

if (user) {
  await user.destroy();
  console.log('User deleted!');
}
```

## Advanced Querying

Firebase ORM provides a powerful query interface:

```typescript
// Complex queries
const activeUsers = await User.query()
  .where('isActive', '==', true)
  .where('createdAt', '>', '2024-01-01')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Pagination
const firstPage = await User.query()
  .orderBy('name')
  .limit(5)
  .get();

// Get next page using the last document
const lastDoc = firstPage[firstPage.length - 1];
const nextPage = await User.query()
  .orderBy('name')
  .startAfter(lastDoc.name)
  .limit(5)
  .get();
```

## Real-time Updates

Listen to real-time changes in your data:

```typescript
// Listen to all user changes
const unsubscribe = User.onList((user) => {
  console.log('User updated:', user.name);
});

// Listen to a specific user
const user = new User();
await user.load('user-id-here');

const unsubscribeUser = user.on(() => {
  console.log('User data changed:', user.name);
});

// Don't forget to unsubscribe when done
// unsubscribe();
// unsubscribeUser();
```

## Working with Relationships

Define relationships between models:

```typescript
// Post model with relationship to User
import { HasMany, BelongsTo } from '@arbel/firebase-orm';

@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ field_name: 'author_id' })
  public authorId!: string;

  @BelongsTo({ model: User, localKey: 'authorId' })
  public author?: User;
}

// Update User model to include posts
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  // ... existing fields ...

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];
}
```

### Using Relationships

```typescript
// Load a user with their posts
const user = new User();
await user.load('user-id-here');

// Load related posts
const posts = await user.loadHasMany('posts');
console.log(`${user.name} has ${posts.length} posts`);

// Load a post with its author
const post = new Post();
await post.load('post-id-here');

const author = await post.loadBelongsTo('author');
console.log(`Post "${post.title}" by ${author.name}`);
```

## Error Handling

Always wrap database operations in try-catch blocks:

```typescript
try {
  const user = new User();
  await user.load('non-existent-id');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('User not found');
  } else {
    console.error('Database error:', error);
  }
}
```

## Complete Example

Here's a complete example that puts it all together:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository, BaseModel, Model, Field, HasMany } from '@arbel/firebase-orm';

// Initialize Firebase
const app = initializeApp({
  // your Firebase config
});
const firestore = getFirestore(app);
FirestoreOrmRepository.initGlobalConnection(firestore);

// Define models
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];
}

@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ field_name: 'author_id' })
  public authorId!: string;
}

// Main application logic
async function main() {
  try {
    // Create a user
    const user = new User();
    user.name = 'Alice Johnson';
    user.email = 'alice@example.com';
    user.createdAt = new Date().toISOString();
    await user.save();

    console.log('✅ User created:', user.getId());

    // Create a post by this user
    const post = new Post();
    post.title = 'My First Post';
    post.content = 'This is the content of my first post!';
    post.authorId = user.getId();
    await post.save();

    console.log('✅ Post created:', post.getId());

    // Load user with their posts
    const userWithPosts = new User();
    await userWithPosts.load(user.getId());
    const posts = await userWithPosts.loadHasMany('posts');

    console.log(`✅ ${userWithPosts.name} has ${posts.length} post(s)`);

    // Query all users
    const allUsers = await User.getAll();
    console.log(`✅ Total users: ${allUsers.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
main();
```

## Next Steps

Now that you've learned the basics, explore more advanced features:

1. **[Models & Fields](./models-and-fields.md)** - Learn about advanced field types and model configuration
2. **[Relationships](./relationships.md)** - Master one-to-one, one-to-many, and many-to-many relationships
3. **[Querying Data](./querying.md)** - Discover advanced querying techniques
4. **[Real-time Features](./realtime.md)** - Build reactive applications with live data updates

## Framework Integration

Check out our framework-specific guides:

- **[Angular](./frameworks/angular.md)** - Services, components, and dependency injection
- **[React](./frameworks/react.md)** - Hooks, context, and state management
- **[Vue.js](./frameworks/vue.md)** - Composables and reactive data
- **[Next.js](./frameworks/nextjs.md)** - SSR, SSG, and API routes
- **[Node.js](./frameworks/nodejs.md)** - Express APIs and backend services

## Common Patterns

### Data Validation

```typescript
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public email!: string;

  // Override save to add validation
  async save() {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }

    // Call parent save method
    return super.save();
  }
}
```

### Soft Deletes

```typescript
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: false, default_value: true })
  public isActive?: boolean;

  @Field({ field_name: 'deleted_at' })
  public deletedAt?: string;

  // Soft delete method
  async softDelete() {
    this.isActive = false;
    this.deletedAt = new Date().toISOString();
    await this.save();
  }

  // Override getAll to exclude soft deleted records
  static async getAll() {
    return await User.query()
      .where('isActive', '==', true)
      .get();
  }
}
```

### Timestamps

```typescript
@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
export class Post extends BaseModel {
  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ field_name: 'updated_at' })
  public updatedAt?: string;

  // Override save to add timestamps
  async save() {
    const now = new Date().toISOString();
    
    if (!this.getId()) {
      // New record
      this.createdAt = now;
    }
    
    this.updatedAt = now;
    
    return super.save();
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: "Cannot find decorator metadata"
**Solution**: Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in `tsconfig.json`

**Issue**: "FirestoreOrmRepository is not initialized"
**Solution**: Make sure you call `FirestoreOrmRepository.initGlobalConnection()` before using any models

**Issue**: "Permission denied" errors
**Solution**: Check your Firestore security rules and ensure proper authentication

**Issue**: Real-time listeners not working
**Solution**: Verify that you're using the client-side Firebase SDK, not the Admin SDK

### Getting Help

- Check the [Troubleshooting Guide](./guides/troubleshooting.md) for detailed solutions
- Review the [Common Patterns](./guides/common-patterns.md) for best practices
- Look at the [Complete Examples](./examples/) for working code samples

## What's Next?

You're now ready to build powerful applications with Firebase ORM! Continue with:

- **[Basic Concepts](./basic-concepts.md)** for deeper understanding
- **[Models & Fields](./models-and-fields.md)** for advanced model features
- Framework-specific guides for your preferred technology stack

Happy coding! 🚀