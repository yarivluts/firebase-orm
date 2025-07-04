# Basic Concepts

Understanding the core concepts of Firebase ORM will help you build robust applications efficiently. This guide covers the fundamental patterns and principles that drive the library.

## Architecture Overview

Firebase ORM follows the **Active Record pattern**, where each model instance represents a single row (document) in your database and contains both data and business logic.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │────│  Firebase ORM   │────│   Firestore     │
│     Layer       │    │    Models       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
    Business              Active Record            Document
     Logic                   Pattern               Storage
```

## Core Components

### 1. Models

Models are the heart of Firebase ORM. They represent your data structure and provide methods to interact with Firestore.

```typescript
import { BaseModel, Model, Field } from '@arbel/firebase-orm';

@Model({
  reference_path: 'users',  // Firestore collection path
  path_id: 'user_id'       // Primary key field name
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;
}
```

**Key Concepts:**
- Each model maps to a Firestore collection
- Models extend `BaseModel` for core functionality
- The `@Model` decorator configures collection settings
- Fields are defined with the `@Field` decorator

### 2. Fields

Fields define the properties of your model and how they map to Firestore document fields.

```typescript
export class User extends BaseModel {
  // Required field
  @Field({ is_required: true })
  public name!: string;

  // Field with custom Firestore name
  @Field({ field_name: 'email_address' })
  public email!: string;

  // Optional field with default value
  @Field({ is_required: false, default_value: true })
  public isActive?: boolean;

  // Array field
  @Field({ is_required: false })
  public tags?: string[];

  // Computed property (not stored in Firestore)
  get displayName(): string {
    return this.name || this.email;
  }
}
```

**Field Options:**
- `is_required`: Whether the field is required
- `field_name`: Custom name in Firestore (defaults to property name)
- `default_value`: Default value for new instances

### 3. Repository Pattern

Firebase ORM uses a global repository to manage database connections and provide centralized configuration.

```typescript
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize with client SDK
FirestoreOrmRepository.initGlobalConnection(firestore);

// Initialize with admin SDK (server-side)
FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');

// Multiple connections for different databases
FirestoreOrmRepository.initGlobalConnection(primaryDb, 'primary');
FirestoreOrmRepository.initGlobalConnection(analyticsDb, 'analytics');
```

## Data Flow

Understanding how data flows through Firebase ORM helps you write efficient applications.

### Create Operation Flow

```
1. new Model()
2. Set properties
3. model.save()
4. Validation
5. Firestore write
6. Update model ID
```

```typescript
// Step-by-step create operation
const user = new User();           // 1. Create instance
user.name = 'John Doe';           // 2. Set properties
user.email = 'john@example.com';
await user.save();                // 3-6. Save to Firestore
console.log(user.getId());        // Access generated ID
```

### Read Operation Flow

```
1. Query/Load request
2. Firestore read
3. Document mapping
4. Model instantiation
5. Return model(s)
```

```typescript
// Load by ID
const user = new User();
await user.load('user-id');       // Steps 1-5

// Query operation
const users = await User.query()  // Steps 1-5 for multiple documents
  .where('isActive', '==', true)
  .get();
```

### Update Operation Flow

```
1. Load existing model
2. Modify properties
3. model.save()
4. Firestore update
5. Optimistic update
```

```typescript
const user = new User();
await user.load('user-id');       // 1. Load existing
user.name = 'Jane Doe';          // 2. Modify
await user.save();               // 3-5. Update Firestore
```

## Model Lifecycle

Each model instance goes through various states during its lifecycle:

```typescript
class User extends BaseModel {
  // Called before saving (create or update)
  async beforeSave() {
    this.updatedAt = new Date().toISOString();
    
    // Validation
    if (!this.email.includes('@')) {
      throw new Error('Invalid email format');
    }
  }

  // Called after saving
  async afterSave() {
    console.log('User saved:', this.getId());
  }

  // Called before deletion
  async beforeDestroy() {
    // Cleanup related data
    await this.cleanupUserData();
  }

  // Called after deletion
  async afterDestroy() {
    console.log('User deleted');
  }
}
```

## Error Handling Philosophy

Firebase ORM follows a fail-fast approach with clear error messages:

```typescript
try {
  const user = new User();
  await user.load('non-existent-id');
} catch (error) {
  // Specific error types for different scenarios
  if (error.message.includes('not found')) {
    // Handle missing document
  } else if (error.message.includes('permission-denied')) {
    // Handle authorization error
  } else {
    // Handle other errors
  }
}
```

**Common Error Types:**
- **Not Found**: Document doesn't exist
- **Permission Denied**: Firestore security rules block access
- **Invalid Argument**: Malformed query or data
- **Network Error**: Connection issues

## Query Philosophy

Firebase ORM provides a fluent query interface that maps closely to Firestore's capabilities:

```typescript
// Chainable query methods
const users = await User.query()
  .where('age', '>', 18)           // Firestore where clause
  .where('isActive', '==', true)   // Multiple conditions
  .orderBy('createdAt', 'desc')    // Sorting
  .limit(10)                       // Pagination
  .get();                          // Execute query

// Method names match Firestore concepts
const count = await User.count();  // Document count
const exists = await User.exists('user-id'); // Document existence
```

**Query Principles:**
- Methods mirror Firestore capabilities
- Chainable for complex queries
- Type-safe with TypeScript
- Efficient execution planning

## Relationships Concepts

Firebase ORM handles relationships while respecting Firestore's document-based nature:

```typescript
// Relationships are lazy-loaded
@Model({ reference_path: 'users', path_id: 'user_id' })
export class User extends BaseModel {
  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];  // Not loaded by default

  // Explicit loading required
  async loadPosts() {
    this.posts = await this.loadHasMany('posts');
    return this.posts;
  }
}
```

**Relationship Principles:**
- Lazy loading by default (performance)
- Explicit loading for control
- Foreign key relationships
- Support for denormalization patterns

## Real-time Philosophy

Real-time features are built on Firestore's native capabilities:

```typescript
// Real-time listeners are event-driven
const unsubscribe = User.onList((user) => {
  // Automatic model instantiation
  console.log('User updated:', user.name);
  console.log('User ID:', user.getId());
});

// Specific event types
User.onList(handleNewUser, 'added');     // Only new users
User.onList(handleUpdatedUser, 'modified'); // Only updates
User.onList(handleDeletedUser, 'removed');  // Only deletions
```

**Real-time Principles:**
- Event-driven architecture
- Automatic model hydration
- Memory-efficient subscriptions
- Type-safe event handling

## Performance Considerations

Firebase ORM is designed with performance in mind:

### 1. Lazy Loading
```typescript
// Relationships aren't loaded unless requested
const user = await User.find('user-id');
// user.posts is undefined until explicitly loaded

const posts = await user.loadHasMany('posts');
// Now user.posts contains the data
```

### 2. Efficient Queries
```typescript
// Use indexes for complex queries
const users = await User.query()
  .where('status', '==', 'active')
  .where('role', '==', 'admin')
  .orderBy('lastLogin', 'desc')
  .get();
```

### 3. Selective Loading
```typescript
// Load only needed fields (when supported)
const users = await User.query()
  .select(['name', 'email'])  // Future feature
  .get();
```

## Security Model

Firebase ORM respects Firestore's security model:

```typescript
// Security rules are enforced at the Firestore level
// Firebase ORM operations will fail if rules deny access

try {
  const sensitiveData = await SensitiveModel.getAll();
} catch (error) {
  if (error.message.includes('permission-denied')) {
    // Handle authorization error
    console.log('User not authorized to read sensitive data');
  }
}
```

**Security Principles:**
- Firestore rules are the authority
- Client-side validation is for UX
- Server-side validation is for security
- Always assume rules can change

## Testing Philosophy

Firebase ORM supports testing with mocking:

```typescript
// Mock the repository for testing
jest.mock('@arbel/firebase-orm', () => ({
  BaseModel: class MockBaseModel {
    save = jest.fn();
    load = jest.fn();
    static getAll = jest.fn(() => Promise.resolve([]));
  },
  FirestoreOrmRepository: {
    initGlobalConnection: jest.fn(),
  },
}));

// Test business logic without database
describe('User model', () => {
  it('should validate email format', () => {
    const user = new User();
    user.email = 'invalid-email';
    
    expect(() => user.validateEmail()).toThrow('Invalid email');
  });
});
```

## Best Practices Summary

### 1. Model Design
- Keep models focused and cohesive
- Use meaningful field names
- Implement validation in model methods
- Consider denormalization for read performance

### 2. Query Optimization
- Use appropriate indexes
- Limit result sets with `.limit()`
- Use pagination for large datasets
- Cache frequently accessed data

### 3. Real-time Usage
- Clean up listeners to prevent memory leaks
- Use specific event types when possible
- Debounce UI updates for rapid changes
- Handle offline scenarios gracefully

### 4. Error Handling
- Wrap database operations in try-catch
- Provide meaningful error messages
- Log errors for debugging
- Have fallback UI states

### 5. Security
- Design security rules first
- Test with different user roles
- Validate data on both client and server
- Use least-privilege access patterns

## Common Patterns

### Repository Pattern Extension
```typescript
export class UserRepository {
  static async findActiveUsers(): Promise<User[]> {
    return await User.query()
      .where('isActive', '==', true)
      .where('deletedAt', '==', null)
      .orderBy('lastActive', 'desc')
      .get();
  }

  static async findByRole(role: string): Promise<User[]> {
    return await User.query()
      .where('role', '==', role)
      .get();
  }
}
```

### Service Layer Pattern
```typescript
export class UserService {
  static async createUser(userData: CreateUserData): Promise<User> {
    // Business logic
    const user = new User();
    Object.assign(user, userData);
    
    // Validation
    await this.validateUserData(user);
    
    // Save
    await user.save();
    
    // Post-creation tasks
    await this.sendWelcomeEmail(user);
    
    return user;
  }
}
```

### Factory Pattern
```typescript
export class ModelFactory {
  static createUser(type: 'admin' | 'user' | 'guest'): User {
    const user = new User();
    
    switch (type) {
      case 'admin':
        user.role = 'admin';
        user.permissions = ['read', 'write', 'delete'];
        break;
      case 'user':
        user.role = 'user';
        user.permissions = ['read', 'write'];
        break;
      case 'guest':
        user.role = 'guest';
        user.permissions = ['read'];
        break;
    }
    
    return user;
  }
}
```

## Migration from Other ORMs

If you're coming from other ORMs, here are key differences:

### From Sequelize (SQL ORM)
```typescript
// Sequelize style
const user = await User.findByPk(id);

// Firebase ORM style
const user = new User();
await user.load(id);
```

### From Mongoose (MongoDB ORM)
```typescript
// Mongoose style
const users = await User.find({ isActive: true });

// Firebase ORM style
const users = await User.query()
  .where('isActive', '==', true)
  .get();
```

### From TypeORM
```typescript
// TypeORM style
const users = await userRepository.find({
  where: { isActive: true }
});

// Firebase ORM style
const users = await User.query()
  .where('isActive', '==', true)
  .get();
```

## Next Steps

Now that you understand the basic concepts:

1. **[Quick Start Guide](./quick-start.md)** - Build your first application
2. **[Models & Fields](./models-and-fields.md)** - Deep dive into model definition
3. **[Relationships](./relationships.md)** - Master data relationships
4. **[Querying Data](./querying.md)** - Advanced query techniques
5. **[Real-time Features](./realtime.md)** - Build reactive applications

Choose a framework guide for specific implementation details:
- **[React](./frameworks/react.md)** for React applications
- **[Vue.js](./frameworks/vue.md)** for Vue applications
- **[Angular](./frameworks/angular.md)** for Angular applications
- **[Node.js](./frameworks/nodejs.md)** for backend services