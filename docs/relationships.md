# Relationships

Firebase ORM provides comprehensive support for one-to-one, one-to-many, and many-to-many relationships through decorators. This allows you to model complex data relationships while maintaining the flexibility of Firestore's NoSQL structure.

## Setting Up Relationships

### Prerequisites

Before defining relationships, ensure you have:

1. **Imported the relationship decorators**:
```typescript
import { BelongsTo, HasOne, HasMany, BelongsToMany } from "@arbel/firebase-orm";
```

2. **Defined your models** with proper `@Model` and `@Field` decorators
3. **Planned your database structure** with clear foreign key patterns

### Database Structure Considerations

When designing relationships in Firebase ORM:

- **Foreign Keys**: Use string fields to store document IDs that reference other collections
- **Collection Naming**: Use consistent naming patterns (e.g., `users`, `posts`, `user_roles`)
- **Path IDs**: Ensure each model has a unique `path_id` field
- **Junction Tables**: For many-to-many relationships, create separate models for junction tables

### Relationship Types Overview

| Relationship | When to Use | Example |
|-------------|-------------|---------|
| `@BelongsTo` | This model has a foreign key pointing to another | User Profile → User |
| `@HasOne` | Another model has a foreign key pointing to this | User → User Profile |
| `@HasMany` | Another model has multiple records pointing to this | User → Posts |
| `@BelongsToMany` | Many-to-many through junction table | User ↔ Roles |

## One-to-One Relationships

One-to-one relationships connect exactly one record in one collection to exactly one record in another collection.

### BelongsTo (this model has the foreign key)

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

### HasOne (other model has the foreign key)

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

## One-to-Many Relationships

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

## Many-to-Many Relationships

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

## Advanced Relationship Loading

### Loading Multiple Relationships

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

### Relationship Loading Methods Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `loadBelongsTo(name)` | Load a single related model via foreign key | `Promise<T & BaseModel>` |
| `loadHasOne(name)` | Load a single related model (reverse foreign key) | `Promise<T & BaseModel>` |
| `loadHasMany(name)` | Load multiple related models | `Promise<Array<T & BaseModel>>` |
| `loadBelongsToMany(name)` | Load many-to-many relationships | `Promise<Array<T & BaseModel>>` |
| `loadWithRelationships(names?)` | Load multiple relationships at once | `Promise<this>` |

### Error Handling

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

## Best Practices and Common Patterns

### 1. Consistent Naming Conventions

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

### 2. Model Initialization Order

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

### 3. Performance Considerations

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

### 4. Data Integrity

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

## Troubleshooting Common Issues

### Issue: "Relationship not found"
```typescript
// ❌ Wrong: Relationship name doesn't match decorator property
@HasMany({ model: Post, foreignKey: 'author_id' })
public userPosts?: Post[];  // Property name is 'userPosts'

await user.loadHasMany('posts'); // ❌ Looking for 'posts' but property is 'userPosts'

// ✅ Correct: Relationship name matches property name
await user.loadHasMany('userPosts'); // ✅ Matches property name
```

### Issue: "No records found"
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

### Issue: Circular Dependencies
```typescript
// ❌ Avoid circular imports - define models in separate files
// user.model.ts
import { Post } from './post.model'; // ❌ Circular if Post imports User

// ✅ Use forward references or organize dependencies properly
// base-models.ts - Define all base models
// relationship-models.ts - Add relationships after base definitions
```

## Complete Example: Blog System

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

## Legacy Relationship Methods

For backward compatibility, the original relationship methods are still available:

```typescript
// Load one related model (assumes foreign key pattern)
const relatedModel = await model.getOneRel(RelatedModel);

// Load many related models (assumes foreign key pattern)  
const relatedModels = await model.getManyRel(RelatedModel);
```

**Note:** These legacy methods use automatic foreign key detection based on model names and may not work reliably with complex relationships. The new decorator-based approach is recommended for all new projects.