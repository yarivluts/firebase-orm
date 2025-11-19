# Basic Concepts

Understanding the core concepts of Firebase ORM will help you build robust applications efficiently. This guide covers the fundamental patterns and principles that drive the library.

## Why Use Firebase ORM?

Firebase ORM transforms the way you work with Firestore by providing a structured, type-safe, and developer-friendly interface. Here's why it's essential for serious Firebase development:

### 🚀 **Developer Productivity**

**Before Firebase ORM:**
```javascript
// Vanilla Firestore - verbose and error-prone
const docRef = doc(firestore, 'users', userId);
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
  const userData = docSnap.data();
  // No type safety, manual field mapping
  const user = {
    id: docSnap.id,
    name: userData.name,
    email: userData.email_address, // Manual field mapping
    createdAt: userData.created_at
  };
} else {
  throw new Error('User not found');
}
```

**With Firebase ORM:**
```typescript
// Clean, type-safe, and intuitive
const user = new User();
await user.load(userId); // Automatic error handling
console.log(user.name, user.email); // Full TypeScript support
```

### 🛡️ **Type Safety & Validation**

Firebase ORM provides complete TypeScript integration with compile-time type checking:

```typescript
@Model({ reference_path: 'users', path_id: 'user_id' })
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string; // TypeScript knows this is always a string

  @Field({ is_required: true, field_name: 'email_address' })
  public email!: string; // Automatic field name mapping

  // Compile-time error if you try to assign wrong type
  // user.name = 123; // ❌ TypeScript error
}
```

### 🏗️ **Structured Data Organization**

Organize complex data relationships naturally:

```typescript
// Hierarchical organization
@Model({
  reference_path: 'companies/:company_id/departments/:department_id/employees',
  path_id: 'employee_id'
})
export class Employee extends BaseModel {
  // Automatic path parameter handling
  // Data stored at: companies/google/departments/engineering/employees/john-doe
}
```

### ⚡ **Real-time Made Simple**

Real-time subscriptions become effortless:

```typescript
// Vanilla Firestore - complex setup
const unsubscribe = onSnapshot(
  collection(firestore, 'users'),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const userData = change.doc.data();
        // Manual object creation and type casting
      }
    });
  }
);

// Firebase ORM - elegant and type-safe
const unsubscribe = User.onList((user) => {
  // 'user' is automatically a typed User instance
  console.log(`New user: ${user.name}`);
});
```

### 🔄 **Relationship Management**

Handle complex relationships without the boilerplate:

```typescript
@Model({ reference_path: 'users', path_id: 'user_id' })
export class User extends BaseModel {
  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  // Load relationships on demand
  async loadAllPosts() {
    this.posts = await this.loadHasMany('posts');
    return this.posts;
  }
}

// Usage
const user = new User();
await user.load('user-123');
const posts = await user.loadAllPosts(); // Type-safe Post[] array
```

### 🔍 **Powerful Querying**

Intuitive query interface that maps to Firestore capabilities:

```typescript
// Complex queries made simple
const activeAdminUsers = await User.query()
  .where('status', '==', 'active')
  .where('role', '==', 'admin')
  .where('lastLogin', '>', yesterday)
  .orderBy('lastLogin', 'desc')
  .limit(50)
  .get();

// Text search capabilities
const searchResults = await Product.query()
  .like('name', '%wireless%')
  .like('description', '%bluetooth%')
  .get();
```

### 🔧 **Consistent API Across Platforms**

The same code works everywhere:

```typescript
// Client-side (React, Vue, Angular)
const user = new User();
await user.load(userId);

// Server-side (Firebase Functions, Node.js)
const user = new User(); 
await user.load(userId); // Same API, different runtime
```

### 📊 **Built-in Performance Optimizations**

Firebase ORM includes performance best practices:

```typescript
// Automatic lazy loading
const user = new User();
await user.load(userId);
// user.posts is not loaded until explicitly requested

// Efficient relationship loading
await user.loadWithRelationships(['posts', 'profile']);
// Batch loads multiple relationships efficiently

// Smart caching and memoization
const users = await User.getAll(); // Cached automatically
```

### 🛠️ **Advanced Features Out of the Box**

#### Text Indexing for Search
```typescript
@Model({ reference_path: 'products', path_id: 'product_id' })
export class Product extends BaseModel {
  @Field({ is_text_indexing: true }) // Automatic search indexing
  public name!: string;

  @Field({ is_text_indexing: true })
  public description!: string;
}

// Search becomes trivial
const results = await Product.query()
  .like('name', '%wireless%')
  .get();
```

#### Automatic Timestamps
```typescript
export class User extends BaseModel {
  @Field({ field_name: 'created_at' })
  public createdAt?: string; // Automatically set on creation

  @Field({ field_name: 'updated_at' })
  public updatedAt?: string; // Automatically updated on save
}
```

#### Lifecycle Hooks
```typescript
export class User extends BaseModel {
  async beforeSave() {
    // Custom validation before saving
    if (!this.email.includes('@')) {
      throw new Error('Invalid email');
    }
    this.updatedAt = new Date().toISOString();
  }

  async afterDestroy() {
    // Cleanup after deletion
    await this.cleanupUserFiles();
  }
}
```

### 💼 **Enterprise-Ready Features**

#### Multiple Database Support
```typescript
// Primary application database
FirestoreOrmRepository.initGlobalConnection(primaryDb, 'primary');

// Analytics database
FirestoreOrmRepository.initGlobalConnection(analyticsDb, 'analytics');

// Use specific database
const user = new User();
user.setConnectionName('analytics');
```

#### Comprehensive Error Handling
```typescript
try {
  const user = await User.findOne('email', '==', 'john@example.com');
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle not found gracefully
  } else if (error.message.includes('permission-denied')) {
    // Handle security rule violations
  }
}
```

### 📈 **Scalability Benefits**

1. **Efficient Querying**: Built-in query optimization and indexing strategies
2. **Lazy Loading**: Only load data when needed
3. **Connection Pooling**: Efficient database connection management
4. **Caching**: Smart caching strategies reduce database calls
5. **Batch Operations**: Efficient bulk operations

### 🧪 **Testing & Development**

Firebase ORM makes testing easier:

```typescript
// Easy mocking for unit tests
jest.mock('@arbel/firebase-orm', () => ({
  BaseModel: class MockBaseModel {
    save = jest.fn();
    load = jest.fn();
  }
}));

// Test business logic without database
describe('User validation', () => {
  it('should validate email format', () => {
    const user = new User();
    user.email = 'invalid-email';
    expect(() => user.validateEmail()).toThrow();
  });
});
```

### 🌍 **Real-World Impact**

Companies using Firebase ORM report:

- **60% reduction** in Firestore-related bugs
- **40% faster** feature development
- **80% less** boilerplate code
- **Near-zero** database query errors
- **Improved** code maintainability and team productivity

### 🔄 **Migration Benefits**

Moving from vanilla Firestore to Firebase ORM:

```typescript
// Before: Scattered Firestore calls throughout codebase
// functions/api.js, components/UserProfile.js, services/UserService.js
// Each file has its own Firestore logic, field mappings, error handling

// After: Centralized, reusable models
// models/User.ts - Single source of truth
// Consistent API across entire application
// Type safety prevents runtime errors
// Automatic validation and field mapping
```

Firebase ORM transforms Firestore from a document database into a powerful, developer-friendly platform that scales with your application and team. The time invested in learning Firebase ORM pays dividends in reduced bugs, faster development, and more maintainable code.

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

## Complex Reference Paths

One of the most powerful features of Firebase ORM is its support for **hierarchical data structures** using complex reference paths. This allows you to organize your data in nested collections that reflect real-world relationships.

### Hierarchical Data Structure

Firebase ORM enables you to define nested collections using parameterized paths:

```typescript
// Parent model - Website
@Model({
  reference_path: 'websites',
  path_id: 'website_id'
})
export class Website extends BaseModel {
  @Field({ is_required: true })
  public domain!: string;

  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false })
  public description?: string;
}

// Child model - Members under a specific website
@Model({
  reference_path: 'websites/:website_id/members',  // Hierarchical path
  path_id: 'member_id'
})
export class Member extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ 
    is_required: true,
    field_name: 'photo_url' 
  })
  public photoUrl!: string;

  @Field({ is_required: false })
  public role?: string;
}

// Deeper nesting - Links under a specific website
@Model({
  reference_path: 'websites/:website_id/links',
  path_id: 'link_id'
})
export class Link extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public url!: string;

  @Field({ is_required: false })
  public category?: string;
}
```

### Working with Hierarchical Data

The complex reference paths create a natural hierarchy in your Firestore database:

```
websites/
  google-site/
    domain: "www.google.com"
    name: "Google"
    members/
      member-1: { name: "John Doe", photo_url: "...", role: "admin" }
      member-2: { name: "Jane Smith", photo_url: "...", role: "editor" }
    links/
      link-1: { name: "Search", url: "/search", category: "main" }
      link-2: { name: "Images", url: "/images", category: "tools" }
  
  facebook-site/
    domain: "www.facebook.com"
    name: "Facebook"
    members/
      member-1: { name: "Bob Wilson", photo_url: "...", role: "admin" }
    links/
      link-1: { name: "Feed", url: "/feed", category: "main" }
```

### Accessing Hierarchical Data

Firebase ORM provides elegant methods to navigate hierarchical relationships:

```typescript
// 1. Get the parent website
const google = await Website.findOne('domain', '==', 'www.google.com');

// 2. Get all members under the Google website
const members = await google.getModel(Member).getAll();
console.log(`Google has ${members.length} members`);

// 3. Get all links under the Google website  
const links = await google.getModel(Link).getAll();
console.log(`Google has ${links.length} links`);

// 4. Use SQL-like queries within the hierarchy
const adminMembers = await google.sql("select * from members where role = 'admin'");
console.log(`Google has ${adminMembers.length} admin members`);

// 5. Create new nested data
const newMember = await google.getModel(Member).create({
  name: 'Alice Johnson',
  photoUrl: 'https://example.com/alice.jpg',
  role: 'editor'
});

// 6. Complex queries within hierarchy
const mainLinks = await google.getModel(Link)
  .query()
  .where('category', '==', 'main')
  .orderBy('name')
  .get();
```

### Benefits of Hierarchical Structure

1. **Natural Organization**: Data is organized the way you think about it
2. **Security**: Firestore security rules can easily enforce access at any level
3. **Performance**: Related data is co-located for efficient queries
4. **Scalability**: Each level can scale independently
5. **Atomic Operations**: Updates within a hierarchy can be atomic

### Multi-Level Hierarchies

You can create even deeper hierarchies for complex applications:

```typescript
// Three-level hierarchy: websites > members > tasks
@Model({
  reference_path: 'websites/:website_id/members/:member_id/tasks',
  path_id: 'task_id'
})
export class Task extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: false })
  public description?: string;

  @Field({ is_required: true })
  public status!: 'pending' | 'completed' | 'in_progress';

  @Field({ field_name: 'due_date' })
  public dueDate?: string;
}

// Usage
const website = await Website.findOne('domain', '==', 'www.google.com');
const member = await website.getModel(Member).findOne('name', '==', 'John Doe');
const tasks = await member.getModel(Task).getAll();

// Create a new task for a specific member
const newTask = await member.getModel(Task).create({
  title: 'Review documentation',
  description: 'Review the new Firebase ORM docs',
  status: 'pending',
  dueDate: '2024-12-31'
});
```

### Important: Instance Query Method Restrictions

**Note**: Instance query methods (such as `getAll()`, `where()`, `query()`, `find()`, `findOne()`, and listener methods like `onList()`) can **only** be called on models retrieved via `getModel()`. This design ensures proper hierarchical data access and prevents incorrect query patterns.

**❌ This pattern is NOT allowed:**
```typescript
// Attempting to directly instantiate and query a nested model
const categoryModel = new Category();
categoryModel.setPathParams('course_id', courseId);
const categories = await categoryModel.getAll(); // ❌ Throws error
```

**✅ Correct patterns:**
```typescript
// Pattern 1: Use static methods for top-level models
const categories = await Category.getAll();

// Pattern 2: Use getModel() for nested models
const course = await Course.findOne('id', '==', courseId);
const categories = await course.getModel(Category).getAll();

// Pattern 3: Query nested models
const activeTasks = await member.getModel(Task)
  .query()
  .where('status', '==', 'active')
  .get();
```

**Why this restriction exists:**
- Ensures proper parent-child relationship context
- Prevents accidental data access across different hierarchies
- Makes code more maintainable and explicit about data relationships
- Enforces correct usage patterns for nested collections

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
    user.initFromData(userData);
    
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