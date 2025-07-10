# Models & Fields

Firebase ORM uses decorators to define models and their fields, providing a clean and intuitive way to work with Firestore data.

## Model Definition

Models are defined using the `@Model` decorator and extend the `BaseModel` class:

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

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
```

## Model Configuration

### @Model Decorator Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `reference_path` | string | Path to the collection in Firestore | `"users"` or `"websites/:website_id/members"` |
| `path_id` | string | Unique identifier field for the model | `"user_id"` |

### Hierarchical Data Structure

Firebase ORM supports complex reference paths for nested collections:

```typescript
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

Working with hierarchical models:

```typescript
// Work with hierarchical data
const website = await Website.findOne('domain', '==', 'www.google.com');
const members = await website.getModel(Member).getAll();
console.log(`${website.domain} has ${members.length} members`);
```

## Field Definition

Fields are defined using the `@Field` decorator:

### @Field Decorator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `is_required` | boolean | `false` | Whether the field is required |
| `field_name` | string | Property name | Custom field name in Firestore |
| `is_text_indexing` | boolean | `false` | Enable text indexing for LIKE searches |

### Field Examples

```typescript
@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  // Required field
  @Field({ is_required: true })
  public name!: string;

  // Custom field name in Firestore
  @Field({ field_name: "price_usd" })
  public price!: number;

  // Optional field
  @Field({ is_required: false })
  public description?: string;

  // Text indexing for search
  @Field({ 
    is_required: true,
    is_text_indexing: true 
  })
  public title!: string;

  // Automatic timestamps
  @Field({ field_name: "created_at" })
  public createdAt?: string;

  @Field({ field_name: "updated_at" })
  public updatedAt?: string;
}
```

## Database Structure Rules

- Only variables with the `@Field` decorator will be saved in the database
- Every model must include a `path_id` attribute that needs to be unique
- `reference_path` is the path of the model data inside the database
- Field names in TypeScript can differ from Firestore field names using `field_name`

## Working with Models

### Creating and Saving

```typescript
// Create a new model instance
const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
user.createdAt = new Date().toISOString();

// Save to Firestore
await user.save();
console.log(`User saved with ID: ${user.getId()}`);
```

### Loading Models

```typescript
// Load by ID
const user = new User();
await user.load('user-123');

// Load and check if exists
try {
  await user.load('user-123');
  console.log(`Loaded user: ${user.name}`);
} catch (error) {
  console.log('User not found');
}
```

### Updating Models

```typescript
// Load, modify, and save
const user = new User();
await user.load('user-123');
user.name = "Jane Doe";
await user.save();
```

### Deleting Models

```typescript
// Delete a model
const user = new User();
await user.load('user-123');
await user.destroy();
```

## Lifecycle Hooks

Firebase ORM provides lifecycle hooks for model operations:

```typescript
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  // Called before saving
  async beforeSave() {
    this.updatedAt = new Date().toISOString();
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
  }

  // Called after saving
  async afterSave() {
    console.log(`User ${this.name} saved successfully`);
  }

  // Called before destroying
  async beforeDestroy() {
    console.log(`About to delete user ${this.name}`);
  }

  // Called after destroying
  async afterDestroy() {
    console.log(`User deleted successfully`);
  }
}
```

## Automatic Timestamps

You can set up automatic timestamp management:

```typescript
@Model({
  reference_path: "posts",
  path_id: "post_id"
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ field_name: "created_at" })
  public createdAt?: string;

  @Field({ field_name: "updated_at" })
  public updatedAt?: string;

  async beforeSave() {
    const now = new Date().toISOString();
    
    if (!this.getId()) {
      // New record
      this.createdAt = now;
    }
    
    // Always update the modified timestamp
    this.updatedAt = now;
  }
}
```

## Best Practices

### 1. Consistent Naming

```typescript
// Use consistent field naming patterns
@Field({ field_name: 'user_id' })    // Foreign key fields
public userId!: string;

@Field({ field_name: 'created_at' })  // Timestamp fields
public createdAt!: string;

@Field({ field_name: 'is_active' })   // Boolean fields
public isActive!: boolean;
```

### 2. Type Safety

```typescript
// Use TypeScript's strict typing
@Field({ is_required: true })
public status!: 'active' | 'inactive' | 'pending';

@Field({ is_required: false })
public metadata?: { [key: string]: any };
```

### 3. Validation

```typescript
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public email!: string;

  async beforeSave() {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }
  }
}
```

### 4. Default Values

```typescript
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false })
  public role: string = 'user'; // Default value

  @Field({ is_required: false })
  public isActive: boolean = true; // Default value
}
```

## Error Handling

```typescript
try {
  const user = new User();
  user.name = "John Doe";
  user.email = "invalid-email"; // This will fail validation
  await user.save();
} catch (error) {
  if (error.message.includes('Invalid email')) {
    console.log('Email validation failed');
  } else if (error.message.includes('required')) {
    console.log('Required field missing');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Field Types

### JSON Fields

```typescript
@Field({ is_required: false })
public settings?: {
  theme: string;
  notifications: boolean;
  language: string;
};
```

### Array Fields

```typescript
@Field({ is_required: false })
public tags?: string[];

@Field({ is_required: false })
public permissions?: Array<{
  resource: string;
  actions: string[];
}>;
```

### Computed Fields

```typescript
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;

  @Field({ is_required: true })
  public lastName!: string;

  // Computed property (not saved to database)
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```