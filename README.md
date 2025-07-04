Arbel Firebase Orm is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native, NativeScript, Expo, and Electron platforms
and can be used with TypeScript and JavaScript (ES5, ES6, ES7, ES8).

Firebase ORM supports only Active Record pattern for now.

Some Arbel Firebase Orm features:

- 🚀 **ActiveRecord Pattern** - Intuitive object-oriented database interaction
- 🔗 **Comprehensive Relationships** - One-to-one, one-to-many, many-to-many with lazy loading
- 🏗️ **Hierarchical Data Structure** - Complex reference paths for nested collections (`websites/:website_id/members`)
- 🛡️ **Type Safety** - Full TypeScript support with compile-time validation
- ⚡ **Real-time Updates** - Live data synchronization with automatic model hydration
- 🔍 **Advanced Querying** - Chainable queries with text search and indexing capabilities
- 🔧 **Cross-Platform** - Same API works in browser, Node.js, and Firebase Functions
- 📊 **Performance Optimized** - Lazy loading, caching, and efficient relationship handling
- 🛠️ **Lifecycle Hooks** - beforeSave, afterSave, beforeDestroy, afterDestroy
- 📝 **Automatic Timestamps** - created_at and updated_at fields managed automatically

And more...

## 📚 Documentation

For comprehensive guides and examples, visit our **[Documentation](./docs/README.md)**:

### Getting Started
- **[Installation & Setup](./docs/installation.md)** - Get Firebase ORM running in your project
- **[Quick Start Guide](./docs/quick-start.md)** - Build your first app in minutes
- **[Basic Concepts](./docs/basic-concepts.md)** - Core concepts and patterns

### Framework Integration
- **[Angular](./docs/frameworks/angular.md)** - Services, components, and dependency injection
- **[Next.js](./docs/frameworks/nextjs.md)** - SSR, SSG, client-side, and API routes
- **[Nuxt.js](./docs/frameworks/nuxtjs.md)** - Vue.js with SSR/SSG support
- **[React](./docs/frameworks/react.md)** - Hooks, context, and state management
- **[Vue.js](./docs/frameworks/vue.md)** - Composables and reactive data
- **[Node.js](./docs/frameworks/nodejs.md)** - Express APIs and backend services
- **[Firebase Functions](./docs/firebase-functions.md)** - Server-side functions, triggers, and APIs

### Core Features
- **[Models & Fields](./docs/models-and-fields.md)** - Model definitions and field types
- **[Relationships](./docs/relationships.md)** - One-to-one, one-to-many, many-to-many
- **[Querying Data](./docs/querying.md)** - Advanced queries and filtering
- **[Real-time Features](./docs/realtime.md)** - Live data updates and subscriptions

### Advanced Topics
- **[Firebase Storage](./docs/advanced/storage.md)** - File uploads and management
- **[Elasticsearch Integration](./docs/advanced/elasticsearch.md)** - Full-text search
- **[Performance Optimization](./docs/advanced/performance.md)** - Scaling best practices
- **[Security & Rules](./docs/advanced/security.md)** - Authentication and authorization

## 🚀 Quick Example

With Firebase ORM your models look like this:

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

// Simple model
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: "created_at" })
  public createdAt?: string;
}

// Complex hierarchical model
@Model({
  reference_path: "websites/:website_id/members",  // Nested structure
  path_id: "member_id"
})
export class Member extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ field_name: "photo_url" })
  public photoUrl!: string;

  @Field({ is_required: false })
  public role?: string;
}
```

And your domain logic looks like this:

```typescript
// Create a new user
const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
user.createdAt = new Date().toISOString();
await user.save();

// Work with hierarchical data
const website = await Website.findOne('domain', '==', 'www.google.com');
const members = await website.getModel(Member).getAll();
console.log(`${website.domain} has ${members.length} members`);

// Query users
const activeUsers = await User.query()
  .where('isActive', '==', true)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Real-time updates
const unsubscribe = User.onList((user) => {
  console.log('User updated:', user.name);
});

// Relationships
const posts = await user.loadHasMany('posts');
console.log(`${user.name} has ${posts.length} posts`);

// Text search
const searchResults = await User.query()
  .like('name', '%john%')
  .get();
```

## 🏃‍♂️ Quick Start

1. **Install Firebase ORM**
   ```bash
   npm install @arbel/firebase-orm firebase moment --save
   ```

2. **Initialize Firebase**
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getFirestore } from 'firebase/firestore';
   import { FirestoreOrmRepository } from '@arbel/firebase-orm';

   const app = initializeApp(firebaseConfig);
   const firestore = getFirestore(app);
   FirestoreOrmRepository.initGlobalConnection(firestore);
   ```

3. **Create your first model**
   ```typescript
   @Model({ reference_path: 'users', path_id: 'user_id' })
   export class User extends BaseModel {
     @Field({ is_required: true })
     public name!: string;
   }
   ```

4. **Start building!**
   ```typescript
   const user = new User();
   user.name = 'John Doe';
   await user.save();
   ```

👉 **[Continue with the full Quick Start Guide](./docs/quick-start.md)**

---

*The following examples show additional features from the original codebase:*
const allMembers = await Member.getAll();

//Get all members with age > 3 and weight > 30
const list = await Member.query().where('age','>','3').where('weight','>','30').get();

//Get all members with age > 3 or age < 3 limit 10
const list = await Member.query().where('age','>','3').orWhere('age','<','3').limit(10).get();

//Get the member tom
const tom = await Member.findOne('firstName','==','Tom');

//Listen to changes in tom data in real time
var unsubscribe = tom.on(()=>{
    //Do something
});

//Get all the list in real time
var unsubscribe = Member.onList((member) => {
    //Do someting with the meber
})
//Get all the list in real time when new meber is addedd
var unsubscribe = Member.onList((member) => {
    //Do someting with the meber
},LIST_EVENTS.ADDEDD)
//Or
var unsubscribe = Member.onModeList({

    /**
     * Listen to add new objects from now
     */
    added?: CallableFunction;

    /**
     * Listen to removed objects
     */
    removed? : CallableFunction

    /**
     * Listen to modify objects
     */
    modified? : CallableFunction

    /**
     * Listen to init loading objects
     */
    init? : CallableFunction
  })

//Kill the listen process
unsubscribe();

```

## Installation

1. Install the npm package:

   `npm install @arbel/firebase-orm firebase rxfire moment --save`

   For Firebase Admin SDK support:

   `npm install @arbel/firebase-orm firebase-admin moment --save`

##### TypeScript configuration

Also, make sure you are using TypeScript compiler version **3.3** or greater,
and you have enabled the following settings in `tsconfig.json`:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
"strictPropertyInitialization" : false,
```

You may also need to enable `es6` in the `lib` section of compiler options, or install `es6-shim` from `@types`.

##### Module Format Support

The library supports both CommonJS (CJS) and ECMAScript Modules (ESM) formats:

- For CommonJS environments (Node.js, older bundlers):
  ```javascript
  const { FirestoreOrmRepository } = require("@arbel/firebase-orm");
  ```

- For ESM environments (modern bundlers, TypeScript with ESM, Node.js with ESM):
  ```javascript
  import { FirestoreOrmRepository } from "@arbel/firebase-orm";
  ```

## Quick Start

1.Create global connection

```typescript
import * as app from "firebase";
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

var firebaseApp = FirestoreOrmRepository.initializeApp(config);

```

## Relationships

Firebase ORM provides comprehensive support for one-to-one, one-to-many, and many-to-many relationships through decorators. This allows you to model complex data relationships while maintaining the flexibility of Firestore's NoSQL structure.

### Setting Up Relationships

#### Prerequisites

Before defining relationships, ensure you have:

1. **Imported the relationship decorators**:
```typescript
import { BelongsTo, HasOne, HasMany, BelongsToMany } from "@arbel/firebase-orm";
```

2. **Defined your models** with proper `@Model` and `@Field` decorators
3. **Planned your database structure** with clear foreign key patterns

#### Database Structure Considerations

When designing relationships in Firebase ORM:

- **Foreign Keys**: Use string fields to store document IDs that reference other collections
- **Collection Naming**: Use consistent naming patterns (e.g., `users`, `posts`, `user_roles`)
- **Path IDs**: Ensure each model has a unique `path_id` field
- **Junction Tables**: For many-to-many relationships, create separate models for junction tables

#### Relationship Types Overview

| Relationship | When to Use | Example |
|-------------|-------------|---------|
| `@BelongsTo` | This model has a foreign key pointing to another | User Profile → User |
| `@HasOne` | Another model has a foreign key pointing to this | User → User Profile |
| `@HasMany` | Another model has multiple records pointing to this | User → Posts |
| `@BelongsToMany` | Many-to-many through junction table | User ↔ Roles |

### One-to-One Relationships

One-to-one relationships connect exactly one record in one collection to exactly one record in another collection.

#### BelongsTo (this model has the foreign key)

Use `@BelongsTo` when **this model stores a foreign key** pointing to another model.

**Database Structure:**
```
users/
  user-1: { name: "John Doe" }
  
user_profiles/
  profile-1: { user_id: "user-1", bio: "Software developer" }
```

**Setup:**
```typescript
import { Field, BaseModel, Model, BelongsTo } from "@arbel/firebase-orm";

// First, define the target model (User)
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;
}

// Then, define the model with the foreign key (UserProfile)
@Model({
  reference_path: 'user_profiles',
  path_id: 'profile_id'
})
class UserProfile extends BaseModel {
  @Field({ is_required: true, field_name: 'user_id' })
  public userId!: string;  // This is the foreign key

  @Field({ is_required: false })
  public bio?: string;

  // Define the relationship
  @BelongsTo({
    model: User,           // The target model class
    localKey: 'userId'     // The local field containing the foreign key
  })
  public user?: User;      // Optional property to hold the loaded relationship
}
```

**Usage:**
```typescript
// Load a profile and its related user
const profile = new UserProfile();
await profile.load('profile-1');

// Method 1: Load the relationship explicitly
const user = await profile.loadBelongsTo('user');
console.log(user.name); // "John Doe"

// Method 2: Access the loaded relationship (after loading)
await profile.loadWithRelationships(['user']);
console.log(profile.user?.name); // "John Doe"
```

#### HasOne (other model has the foreign key)

Use `@HasOne` when **another model has a foreign key** pointing to this model.

**Database Structure:**
```
users/
  user-1: { name: "John Doe" }
  
user_profiles/
  profile-1: { user_id: "user-1", bio: "Software developer" }
```

**Setup:**
```typescript
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // Define the relationship
  @HasOne({
    model: UserProfile,     // The model that has the foreign key
    foreignKey: 'user_id'   // The field in UserProfile that references this User
  })
  public profile?: UserProfile;
}
```

**Usage:**
```typescript
// Load a user and their profile
const user = new User();
await user.load('user-1');

// Load the related profile
const profile = await user.loadHasOne('profile');
console.log(profile.bio); // "Software developer"
```

### One-to-Many Relationships

One-to-many relationships connect one record to multiple related records. This is common for parent-child relationships like User → Posts or Category → Products.

**Database Structure:**
```
users/
  user-1: { name: "John Doe" }
  user-2: { name: "Jane Smith" }

posts/
  post-1: { title: "First Post", author_id: "user-1" }
  post-2: { title: "Second Post", author_id: "user-1" }
  post-3: { title: "Jane's Post", author_id: "user-2" }
```

**Setup:**
```typescript
// Define the "many" side (Post belongs to User)
@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true, field_name: 'author_id' })
  public authorId!: string;  // Foreign key to User

  // Each post belongs to one user
  @BelongsTo({
    model: User,
    localKey: 'authorId'
  })
  public author?: User;
}

// Define the "one" side (User has many Posts)
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // User has many posts
  @HasMany({
    model: Post,              // The model that contains the foreign key
    foreignKey: 'author_id'   // The field in Post that references this User
  })
  public posts?: Post[];
}
```

**Usage:**
```typescript
// Load a user and their posts
const user = new User();
await user.load('user-1');

// Load all posts by this user
const posts = await user.loadHasMany('posts');
console.log(posts.length); // 2
console.log(posts[0].title); // "First Post"

// Load a post and its author
const post = new Post();
await post.load('post-1');

const author = await post.loadBelongsTo('author');
console.log(author.name); // "John Doe"

// Load both relationships at once
await user.loadWithRelationships(['posts']);
await post.loadWithRelationships(['author']);
```

### Many-to-Many Relationships

Many-to-many relationships connect multiple records from one collection to multiple records in another collection. This requires a **junction table** (also called a pivot table) to store the relationships.

**Database Structure:**
```
users/
  user-1: { name: "John Doe" }
  user-2: { name: "Jane Smith" }

roles/
  role-1: { name: "Admin" }
  role-2: { name: "Editor" }
  role-3: { name: "Viewer" }

user_roles/ (junction table)
  ur-1: { user_id: "user-1", role_id: "role-1" }
  ur-2: { user_id: "user-1", role_id: "role-2" }
  ur-3: { user_id: "user-2", role_id: "role-3" }
```

**Setup:**
```typescript
// Step 1: Define the junction table model
@Model({
  reference_path: 'user_roles',
  path_id: 'user_role_id'
})
class UserRole extends BaseModel {
  @Field({ is_required: true, field_name: 'user_id' })
  public userId!: string;

  @Field({ is_required: true, field_name: 'role_id' })
  public roleId!: string;

  // Optional: You can add relationships to the junction table too
  @BelongsTo({ model: User, localKey: 'userId' })
  public user?: User;

  @BelongsTo({ model: Role, localKey: 'roleId' })
  public role?: Role;
}

// Step 2: Define the Role model
@Model({
  reference_path: 'roles',
  path_id: 'role_id'
})
class Role extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // Many-to-many: Role belongs to many users
  @BelongsToMany({
    model: User,           // The target model
    through: UserRole,     // The junction table model
    thisKey: 'role_id',    // Field in junction table that references this Role
    otherKey: 'user_id'    // Field in junction table that references the User
  })
  public users?: User[];
}

// Step 3: Define the User model
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // Many-to-many: User belongs to many roles
  @BelongsToMany({
    model: Role,           // The target model
    through: UserRole,     // The junction table model
    thisKey: 'user_id',    // Field in junction table that references this User
    otherKey: 'role_id'    // Field in junction table that references the Role
  })
  public roles?: Role[];
}
```

**Usage:**
```typescript
// Load a user and their roles
const user = new User();
await user.load('user-1');

const roles = await user.loadBelongsToMany('roles');
console.log(roles.length); // 2
console.log(roles.map(r => r.name)); // ["Admin", "Editor"]

// Load a role and its users
const role = new Role();
await role.load('role-1');

const users = await role.loadBelongsToMany('users');
console.log(users.length); // 1
console.log(users[0].name); // "John Doe"

// Create new many-to-many relationships
const newUser = new User();
newUser.name = "Bob Wilson";
await newUser.save();

const adminRole = new Role();
await adminRole.load('role-1'); // Load existing Admin role

// Create the junction record
const userRole = new UserRole();
userRole.userId = newUser.getId();
userRole.roleId = adminRole.getId();
await userRole.save();
```

### Advanced Relationship Loading

#### Loading Multiple Relationships

You can load all relationships at once using `loadWithRelationships()`:

```typescript
const user = new User();
await user.load('user-id');

// Load multiple relationships in one call
await user.loadWithRelationships(['profile', 'posts', 'roles']);

// Now you can access all loaded relationships
console.log(user.profile?.bio);
console.log(user.posts?.length);
console.log(user.roles?.map(r => r.name));

// Or load all relationships (if none specified, loads all defined relationships)
await user.loadWithRelationships();
```

#### Relationship Loading Methods Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `loadBelongsTo(name)` | Load a single related model via foreign key | `Promise<T & BaseModel>` |
| `loadHasOne(name)` | Load a single related model (reverse foreign key) | `Promise<T & BaseModel>` |
| `loadHasMany(name)` | Load multiple related models | `Promise<Array<T & BaseModel>>` |
| `loadBelongsToMany(name)` | Load many-to-many relationships | `Promise<Array<T & BaseModel>>` |
| `loadWithRelationships(names?)` | Load multiple relationships at once | `Promise<this>` |

#### Error Handling

```typescript
try {
  const user = new User();
  await user.load('user-id');
  
  const posts = await user.loadHasMany('posts');
  console.log(`User has ${posts.length} posts`);
} catch (error) {
  if (error.message.includes('Relationship not found')) {
    console.log('Relationship not defined on model');
  } else if (error.message.includes('not found')) {
    console.log('Related record not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Best Practices and Common Patterns

#### 1. Consistent Naming Conventions

```typescript
// Use consistent field naming patterns
@Field({ field_name: 'user_id' })    // Foreign key fields
public userId!: string;

@Field({ field_name: 'created_at' })  // Timestamp fields
public createdAt!: string;

// Use descriptive relationship names
@HasMany({ model: Post, foreignKey: 'author_id' })
public posts?: Post[];  // Clear what this represents

@BelongsTo({ model: User, localKey: 'authorId' })
public author?: User;   // Singular for one-to-one/many-to-one
```

#### 2. Model Initialization Order

```typescript
// Define models in dependency order to avoid circular references
// 1. Base models first (no dependencies)
class User extends BaseModel { /* ... */ }
class Role extends BaseModel { /* ... */ }

// 2. Junction tables next
class UserRole extends BaseModel { /* ... */ }

// 3. Models with relationships last
class Post extends BaseModel {
  @BelongsTo({ model: User, localKey: 'authorId' })
  public author?: User;
}
```

#### 3. Performance Considerations

```typescript
// Load relationships only when needed
const users = await User.getAll();

// Avoid N+1 queries - batch load relationships
for (const user of users) {
  await user.loadWithRelationships(['posts']); // Load all at once
}

// Or use specific loading methods
const activePosts = await user.loadHasMany('posts').then(posts => 
  posts.filter(p => p.status === 'active')
);
```

#### 4. Data Integrity

```typescript
// Always validate foreign keys before saving
class Post extends BaseModel {
  async save() {
    // Validate author exists before saving
    if (this.authorId) {
      const author = new User();
      try {
        await author.load(this.authorId);
      } catch (error) {
        throw new Error(`Invalid author_id: ${this.authorId}`);
      }
    }
    return super.save();
  }
}
```

### Troubleshooting Common Issues

#### Issue: "Relationship not found"
```typescript
// ❌ Wrong: Relationship name doesn't match decorator property
@HasMany({ model: Post, foreignKey: 'author_id' })
public userPosts?: Post[];  // Property name is 'userPosts'

await user.loadHasMany('posts'); // ❌ Looking for 'posts' but property is 'userPosts'

// ✅ Correct: Relationship name matches property name
await user.loadHasMany('userPosts'); // ✅ Matches property name
```

#### Issue: "No records found"
```typescript
// Check if the foreign key relationship is correct
const profile = new UserProfile();
profile.userId = 'wrong-user-id'; // ❌ Non-existent user ID

try {
  const user = await profile.loadBelongsTo('user');
} catch (error) {
  console.log('User not found for profile'); // Handle gracefully
}
```

#### Issue: Circular Dependencies
```typescript
// ❌ Avoid circular imports - define models in separate files
// user.model.ts
import { Post } from './post.model'; // ❌ Circular if Post imports User

// ✅ Use forward references or organize dependencies properly
// base-models.ts - Define all base models
// relationship-models.ts - Add relationships after base definitions
```

### Complete Example: Blog System

Here's a complete example showing how to set up a blog system with relationships:

```typescript
import { Field, BaseModel, Model, BelongsTo, HasOne, HasMany, BelongsToMany } from "@arbel/firebase-orm";

// 1. Base Models (no dependencies)
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ is_required: false, field_name: 'created_at' })
  public createdAt?: string;

  // Relationships
  @HasOne({ model: UserProfile, foreignKey: 'user_id' })
  public profile?: UserProfile;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  @HasMany({ model: Comment, foreignKey: 'user_id' })
  public comments?: Comment[];

  @BelongsToMany({
    model: Tag,
    through: UserTag,
    thisKey: 'user_id',
    otherKey: 'tag_id'
  })
  public followedTags?: Tag[];
}

@Model({
  reference_path: 'tags',
  path_id: 'tag_id'
})
export class Tag extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false })
  public description?: string;

  // Relationships
  @BelongsToMany({
    model: Post,
    through: PostTag,
    thisKey: 'tag_id',
    otherKey: 'post_id'
  })
  public posts?: Post[];

  @BelongsToMany({
    model: User,
    through: UserTag,
    thisKey: 'tag_id',
    otherKey: 'user_id'
  })
  public followers?: User[];
}

// 2. Junction Tables
@Model({
  reference_path: 'post_tags',
  path_id: 'post_tag_id'
})
export class PostTag extends BaseModel {
  @Field({ is_required: true, field_name: 'post_id' })
  public postId!: string;

  @Field({ is_required: true, field_name: 'tag_id' })
  public tagId!: string;
}

@Model({
  reference_path: 'user_tags',
  path_id: 'user_tag_id'
})
export class UserTag extends BaseModel {
  @Field({ is_required: true, field_name: 'user_id' })
  public userId!: string;

  @Field({ is_required: true, field_name: 'tag_id' })
  public tagId!: string;
}

// 3. Dependent Models
@Model({
  reference_path: 'user_profiles',
  path_id: 'profile_id'
})
export class UserProfile extends BaseModel {
  @Field({ is_required: true, field_name: 'user_id' })
  public userId!: string;

  @Field({ is_required: false })
  public bio?: string;

  @Field({ is_required: false, field_name: 'avatar_url' })
  public avatarUrl?: string;

  @Field({ is_required: false })
  public website?: string;

  // Relationships
  @BelongsTo({ model: User, localKey: 'userId' })
  public user?: User;
}

@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ is_required: true, field_name: 'author_id' })
  public authorId!: string;

  @Field({ is_required: false, field_name: 'published_at' })
  public publishedAt?: string;

  @Field({ is_required: false })
  public status?: 'draft' | 'published' | 'archived';

  // Relationships
  @BelongsTo({ model: User, localKey: 'authorId' })
  public author?: User;

  @HasMany({ model: Comment, foreignKey: 'post_id' })
  public comments?: Comment[];

  @BelongsToMany({
    model: Tag,
    through: PostTag,
    thisKey: 'post_id',
    otherKey: 'tag_id'
  })
  public tags?: Tag[];
}

@Model({
  reference_path: 'comments',
  path_id: 'comment_id'
})
export class Comment extends BaseModel {
  @Field({ is_required: true })
  public content!: string;

  @Field({ is_required: true, field_name: 'post_id' })
  public postId!: string;

  @Field({ is_required: true, field_name: 'user_id' })
  public userId!: string;

  @Field({ is_required: false, field_name: 'parent_id' })
  public parentId?: string; // For nested comments

  @Field({ is_required: false, field_name: 'created_at' })
  public createdAt?: string;

  // Relationships
  @BelongsTo({ model: Post, localKey: 'postId' })
  public post?: Post;

  @BelongsTo({ model: User, localKey: 'userId' })
  public user?: User;

  @BelongsTo({ model: Comment, localKey: 'parentId' })
  public parent?: Comment;

  @HasMany({ model: Comment, foreignKey: 'parent_id' })
  public replies?: Comment[];
}

// Usage Examples:

// Create a new blog post with relationships
async function createBlogPost() {
  // 1. Create or load the author
  const author = new User();
  author.name = "John Doe";
  author.email = "john@example.com";
  author.createdAt = new Date().toISOString();
  await author.save();

  // 2. Create the post
  const post = new Post();
  post.title = "Getting Started with Firebase ORM";
  post.content = "This is a comprehensive guide...";
  post.authorId = author.getId();
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  await post.save();

  // 3. Create some tags
  const jsTag = new Tag();
  jsTag.name = "JavaScript";
  jsTag.description = "JavaScript programming language";
  await jsTag.save();

  const ormTag = new Tag();
  ormTag.name = "ORM";
  ormTag.description = "Object-Relational Mapping";
  await ormTag.save();

  // 4. Associate tags with the post
  const postTag1 = new PostTag();
  postTag1.postId = post.getId();
  postTag1.tagId = jsTag.getId();
  await postTag1.save();

  const postTag2 = new PostTag();
  postTag2.postId = post.getId();
  postTag2.tagId = ormTag.getId();
  await postTag2.save();

  return { post, author, tags: [jsTag, ormTag] };
}

// Load a complete blog post with all relationships
async function loadBlogPostWithRelationships(postId: string) {
  const post = new Post();
  await post.load(postId);

  // Load all relationships
  await post.loadWithRelationships(['author', 'comments', 'tags']);

  // Access the loaded data
  console.log(`Post: ${post.title}`);
  console.log(`Author: ${post.author?.name}`);
  console.log(`Tags: ${post.tags?.map(t => t.name).join(', ')}`);
  console.log(`Comments: ${post.comments?.length} comments`);

  // Load nested relationships for comments
  if (post.comments) {
    for (const comment of post.comments) {
      await comment.loadWithRelationships(['user', 'replies']);
      console.log(`Comment by ${comment.user?.name}: ${comment.content}`);
      
      if (comment.replies?.length) {
        for (const reply of comment.replies) {
          await reply.loadBelongsTo('user');
          console.log(`  Reply by ${reply.user?.name}: ${reply.content}`);
        }
      }
    }
  }

  return post;
}

// Find posts by tag
async function findPostsByTag(tagName: string) {
  // Find the tag
  const tag = await Tag.findOne('name', '==', tagName);
  if (!tag) {
    throw new Error(`Tag '${tagName}' not found`);
  }

  // Load posts with this tag
  const posts = await tag.loadBelongsToMany('posts');
  
  // Load authors for all posts
  for (const post of posts) {
    await post.loadBelongsTo('author');
  }

  return posts;
}

// Get user's blog activity
async function getUserBlogActivity(userId: string) {
  const user = new User();
  await user.load(userId);

  // Load all user's blog-related data
  await user.loadWithRelationships(['profile', 'posts', 'comments', 'followedTags']);

  const activity = {
    user: {
      name: user.name,
      email: user.email,
      bio: user.profile?.bio,
      avatar: user.profile?.avatarUrl
    },
    stats: {
      postsCount: user.posts?.length || 0,
      commentsCount: user.comments?.length || 0,
      followedTagsCount: user.followedTags?.length || 0
    },
    recentPosts: user.posts?.slice(0, 5).map(p => ({
      title: p.title,
      status: p.status,
      publishedAt: p.publishedAt
    })),
    followedTags: user.followedTags?.map(t => t.name)
  };

  return activity;
}
```

### Legacy Relationship Methods

For backward compatibility, the original relationship methods are still available:

```typescript
// Load one related model (assumes foreign key pattern)
const relatedModel = await model.getOneRel(RelatedModel);

// Load many related models (assumes foreign key pattern)  
const relatedModels = await model.getManyRel(RelatedModel);
```

**Note:** These legacy methods use automatic foreign key detection based on model names and may not work reliably with complex relationships. The new decorator-based approach is recommended for all new projects.

1.Initialize with Firebase Admin SDK

```typescript
import * as admin from "firebase-admin";
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

// Initialize Firebase Admin with your credentials
const adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com",
  storageBucket: "your-project-id.appspot.com"
});

// Initialize Firebase ORM with the Admin app
FirestoreOrmRepository.initializeAdminApp(adminApp);

// Initialize storage (optional)
const adminStorage = admin.storage();
FirestoreOrmRepository.initGlobalStorage(adminStorage);
```

## Usage with Firebase Admin

1.Initialize with Firebase Admin SDK

```typescript
import * as admin from "firebase-admin";
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

// Initialize Firebase Admin with your credentials
const adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com",
  storageBucket: "your-project-id.appspot.com"
});

// Initialize Firebase ORM with the Admin app
FirestoreOrmRepository.initializeAdminApp(adminApp);

// Initialize storage (optional)
const adminStorage = admin.storage();
FirestoreOrmRepository.initGlobalStorage(adminStorage);
```

2.Create global path id - (optional)

```typescript
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

FirestoreOrmRepository.initGlobalPath("user_id", 50);
```

3.Create new object

```typescript
import { Member } from "model/member";

const member = new Member();
member.name = "Timber";
member.photoUrl = "https://www.example.com/image.png";
member.save();
```

## Database Structure

- only varibales with the decorator @Field will save in the database
- every model must to include path_id attribute that need to be unique
- reference_path is the path of the model data inside the dataabse

## Text indexing / LIKE Search

1.Add the flag `is_text_indexing` to @Field decorator

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "websites/:website_id/members",
  path_id: "member_id"
})
export class Member extends BaseModel {
  @Field({
    is_text_indexing: true
  })
  public name!: string;

  @Field({
    is_required: true
  })
  public age!: number;

  @Field({
    is_required: true
  })
  public weight!: number;
}
```

2. save new value inside the variable.
3. use like operator as you need

```typescript
//Get all members with age > 3 and weight > 30 and name conatin `Dav`
const list = await Member.query()
  .where("age", ">", "3")
  .where("weight", ">", "30")
  .like("name", "%Dav%")
  .get();
```

## Elasticsearch support

1.Add firebase function with onWrite trigger

```typescript
import * as functions from "firebase-functions";
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  cloud: {
    id: "xxxxxxx",
    username: "xxxxx",
    password: "xxxxxxx"
  }
});

export const elasticsearchProductsSync = functions.firestore
  .document("products/{productId}")
  .onWrite((snap, context) => {
    const productId = context.params.productId;
    const newData = snap.after.data();
    // ...or the previous value before this update
    const previousData = snap.before.data();

    if (newData) {
      newData.id = productId;

      if (!previousData) {
        printLog("create new product - ", productId);
        client
          .create({
            index: "products",
            type: "_doc",
            id: productId,
            body: newData
          })
          .catch(e => {
            var error =
              e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
            console.error("Elasticsearch error - ", error);
          });
      } else {
        printLog("update product - ", productId);
        client.transport
          .request({
            method: "POST",
            path: "/products/_doc/" + productId,
            body: newData
          })
          .catch(e => {
            var error =
              e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
            console.error("Elasticsearch error - ", error);
          });
      }
    } else {
      printLog("delete product - ", productId);
      client
        .delete({
          index: "products",
          type: "_doc",
          id: productId
        })
        .catch(e => {
          var error =
            e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
          console.error("Elasticsearch error - ", error);
        });
    }

    return true;
  });
```

2. set global elasticsearch url

```typescript
FirestoreOrmRepository.initGlobalElasticsearchConnection(
  "https://elasticsearch.com"
);
```

3. fetch the data as sql

```typescript
var result: any = await Product.elasticSql("WHERE qty > 0", 3);
//Total rows
var totalCount = await result.count();
var current = 0;
//Pagination
while (result.next) {
  index++;
  var result = await result.next();
}
```

4. or to use binding sql

```typescript
var result: any = await Product.elasticSql([
  "WHERE name in (:options)  and cost > :cost",
  {
    options: ["a", "b", "c"],
    cost: 9
  }
]);
//Total rows
var totalCount = await result.count();
var current = 0;
//Pagination
while (result.next) {
  index++;
  var result = await result.next();
}
```

## Firebase Storage support

1.Initilize firebase storage connection

```typescript
var firebaseApp: any = firebase.initializeApp(config.api.firebase);
var storage = firebaseApp.storage();
FirestoreOrmRepository.initGlobalStorage(storage);
```

2. Get the storage reference of the wanted field

```typescript
var product = new Product();
product.name = "test product";
var storageRef = product.getStorageFile("photoUrl");
```

3. Upload file

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadFile(file);
product.save();
```

4. Upload file from string

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadString(file,'base64');
product.save();
```

5. Upload file from url (copy file to storage)

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadFromUrl(url);
product.save();
```

6. Get file firebase storage ref 

```typescript
var product = new Product();
var ref = product.getStorageFile("photoUrl").getRef();
```

7. Track progress
```typescript
var product = new Product();
product.name = "test product";
var storageRef = product.getStorageFile("photoUrl");
await storageRef.uploadFromUrl(
  "https://img.example.com/image.jpg",
  function(snapshot: any) {
    // Observe state change events such as progress, pause, and resume
    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    switch (snapshot.state) {
      case firebase.storage.TaskState.PAUSED: // or 'paused'
        break;
      case firebase.storage.TaskState.RUNNING: // or 'running'
        break;
    }
  },
  function(error: any) {
    // Handle unsuccessful uploads
  },
  function(task: any) {
    // Handle successful uploads on complete
    // For instance, get the download URL: https://firebasestorage.googleapis.com/...
    task.snapshot.ref.getDownloadURL().then(function(downloadURL: any) {
      printLog("File available at", downloadURL);
    });
  }
);
await product.save();
```
