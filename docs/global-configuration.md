# Global Configuration

Firebase ORM now supports global configuration options that provide convenient defaults and automation features. These configurations help maintain consistency across your models and reduce boilerplate code.

## Overview

Global configuration allows you to:

1. **Auto Lower Case Field Names**: Automatically convert camelCase field names to snake_case format
2. **Auto Path ID**: Automatically generate path_id from class names
3. **Validation**: Ensure all models have proper path_id configuration

## Setting Global Configuration

Use the `FirestoreOrmRepository.setGlobalConfig()` method to configure global options:

```typescript
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Enable both auto features
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: true
});

// Or configure individually
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true
});

FirestoreOrmRepository.setGlobalConfig({
  auto_path_id: true
});
```

## Auto Lower Case Field Names

When `auto_lower_case_field_name` is enabled, field names are automatically converted from camelCase to snake_case format for database storage.

### Without Auto Lower Case (Default)

```typescript
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;  // Stored as "firstName"

  @Field({ is_required: true })
  public cartItem!: string;   // Stored as "cartItem"
}
```

### With Auto Lower Case Enabled

```typescript
// Enable global configuration
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true
});

@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;  // Stored as "first_name"

  @Field({ is_required: true })
  public cartItem!: string;   // Stored as "cart_item"

  @Field({ 
    is_required: true,
    field_name: 'custom_field'  // Explicit field_name overrides auto conversion
  })
  public someField!: string;   // Stored as "custom_field"
}
```

### Conversion Rules

- `cartItem` → `cart_item`
- `firstName` → `first_name`
- `photoURL` → `photo_u_r_l`
- `userID` → `user_i_d`
- `simpleField` → `simple_field`
- `field` → `field` (single words remain unchanged)

**Important**: Explicit `field_name` values always take precedence over auto conversion.

## Auto Path ID

When `auto_path_id` is enabled, the ORM automatically generates `path_id` from the class name if not explicitly provided.

### Without Auto Path ID (Default)

```typescript
@Model({
  reference_path: 'users',
  path_id: 'user_id'  // Required - will throw error if missing
})
export class User extends BaseModel {
  // ...
}
```

### With Auto Path ID Enabled

```typescript
// Enable global configuration
FirestoreOrmRepository.setGlobalConfig({
  auto_path_id: true
});

@Model({
  reference_path: 'users'
  // path_id is optional - will be auto-generated as "user_id"
})
export class User extends BaseModel {
  // ...
}

@Model({
  reference_path: 'shopping_carts'
  // path_id auto-generated as "shopping_cart_id"
})
export class ShoppingCart extends BaseModel {
  // ...
}

@Model({
  reference_path: 'profiles',
  path_id: 'custom_profile_id'  // Explicit path_id overrides auto generation
})
export class UserProfile extends BaseModel {
  // ...
}
```

### Generation Rules

- `User` → `user_id`
- `ShoppingCart` → `shopping_cart_id`
- `UserProfile` → `user_profile_id`
- `HTTPRequest` → `h_t_t_p_request_id`
- `UserId` → `user_id` (avoids duplicate `_id` suffix)

**Important**: Explicit `path_id` values always take precedence over auto generation.

## Validation

When `auto_path_id` is **disabled** (default), all models must have an explicit `path_id` defined. If missing, the decorator will throw an error:

```typescript
// This will throw an error when auto_path_id is disabled
@Model({
  reference_path: 'users'
  // Missing path_id!
})
export class User extends BaseModel {
  // Error: Model 'User' must have a path_id defined in @Model decorator 
  // or enable auto_path_id in global configuration
}
```

## Getting Current Configuration

You can retrieve the current global configuration:

```typescript
const config = FirestoreOrmRepository.getGlobalConfig();
console.log(config.auto_lower_case_field_name); // true/false
console.log(config.auto_path_id); // true/false
```

## Best Practices

### Recommended Configuration

For new projects, we recommend enabling both features:

```typescript
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: true
});
```

### Naming Conventions

1. **Collection Names**: Use lowercase with underscores
   ```typescript
   @Model({
     reference_path: 'user_profiles'  // ✅ Good
     // reference_path: 'userProfiles'  // ❌ Avoid
   })
   ```

2. **Field Names**: Use camelCase in TypeScript, let auto conversion handle storage
   ```typescript
   @Field()
   public firstName!: string;  // ✅ Good - becomes first_name in DB

   @Field({ field_name: 'first_name' })
   public firstName!: string;  // ✅ Also good - explicit naming
   ```

3. **Model Class Names**: Use PascalCase
   ```typescript
   export class UserProfile extends BaseModel { }  // ✅ Good
   export class userprofile extends BaseModel { }  // ❌ Avoid
   ```

### Migration Strategy

If you're migrating an existing project:

1. **Start with field names only**:
   ```typescript
   FirestoreOrmRepository.setGlobalConfig({
     auto_lower_case_field_name: true,
     auto_path_id: false  // Keep existing path_ids
   });
   ```

2. **Gradually adopt auto path_id** for new models while keeping explicit path_id for existing ones.

3. **Use explicit field_name** for fields that need specific database column names.

## Complete Example

```typescript
import { FirestoreOrmRepository, Model, Field, BaseModel } from '@arbel/firebase-orm';

// Configure global settings
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: true
});

// User model with auto-generated path_id and auto-converted field names
@Model({
  reference_path: 'users'
  // path_id auto-generated as "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;  // Stored as "first_name"

  @Field({ is_required: true })
  public lastName!: string;   // Stored as "last_name"

  @Field({ is_required: true })
  public emailAddress!: string; // Stored as "email_address"

  @Field({ 
    is_required: false,
    field_name: 'avatar_url'  // Custom field name
  })
  public profileImage?: string; // Stored as "avatar_url"
}

// Shopping cart with complex class name
@Model({
  reference_path: 'shopping_carts'
  // path_id auto-generated as "shopping_cart_id"
})
export class ShoppingCart extends BaseModel {
  @Field({ is_required: true })
  public cartItems!: string[];  // Stored as "cart_items"

  @Field({ is_required: true })
  public totalPrice!: number;   // Stored as "total_price"

  @Field({ is_required: true })
  public createdAt!: string;    // Stored as "created_at"
}

// Usage
async function example() {
  const user = new User();
  user.firstName = 'John';
  user.lastName = 'Doe';
  user.emailAddress = 'john@example.com';
  
  await user.save();
  
  console.log('User saved with auto-generated path_id:', user.pathId); // "user_id"
  console.log('Database data:', user.getData()); 
  // { first_name: 'John', last_name: 'Doe', email_address: 'john@example.com' }
}
```

This global configuration system helps maintain consistency across your Firebase ORM models while reducing boilerplate and ensuring best practices are followed automatically.