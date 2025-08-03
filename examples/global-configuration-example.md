# Global Configuration Integration Example

This example demonstrates how the new global configuration features work together to provide a clean, modern development experience.

## Setup

```typescript
import { FirestoreOrmRepository, Model, Field, BaseModel } from '@arbel/firebase-orm';

// Enable all global configuration features
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: true
});
```

## Models

With global configuration enabled, your models become much cleaner:

```typescript
// User model - path_id auto-generated as 'user_id'
@Model({
  reference_path: 'users'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;        // → first_name in database

  @Field({ is_required: true })
  public lastName!: string;         // → last_name in database

  @Field({ is_required: true })
  public emailAddress!: string;     // → email_address in database

  @Field({ is_required: false })
  public phoneNumber?: string;      // → phone_number in database
}

// Shopping cart model - path_id auto-generated as 'shopping_cart_id'
@Model({
  reference_path: 'shopping_carts'
})
export class ShoppingCart extends BaseModel {
  @Field({ is_required: true })
  public userId!: string;           // → user_id in database

  @Field({ is_required: true })
  public cartItems!: string[];      // → cart_items in database

  @Field({ is_required: true })
  public totalPrice!: number;       // → total_price in database

  @Field({ is_required: false })
  public discountCode?: string;     // → discount_code in database

  @Field({ 
    is_required: false,
    field_name: 'created_timestamp'  // Custom field name overrides auto conversion
  })
  public createdAt?: string;        // → created_timestamp in database
}

// Product model - demonstrates mixed usage
@Model({
  reference_path: 'products',
  path_id: 'custom_product_id'      // Explicit path_id overrides auto generation
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public productName!: string;      // → product_name in database

  @Field({ is_required: true })
  public categoryId!: string;       // → category_id in database

  @Field({ is_required: false })
  public imageURL?: string;         // → image_u_r_l in database

  @Field({ 
    field_name: 'price_cents'       // Explicit field name
  })
  public priceInCents!: number;     // → price_cents in database
}
```

## Usage

```typescript
async function example() {
  // Create a user
  const user = new User();
  user.firstName = 'John';
  user.lastName = 'Doe';
  user.emailAddress = 'john.doe@example.com';
  user.phoneNumber = '+1-555-0123';
  
  await user.save();
  console.log('User ID:', user.getId());
  console.log('Path ID:', user.pathId);  // 'user_id'
  
  // Create a shopping cart
  const cart = new ShoppingCart();
  cart.userId = user.getId();
  cart.cartItems = ['item1', 'item2', 'item3'];
  cart.totalPrice = 99.99;
  cart.discountCode = 'SAVE10';
  cart.createdAt = new Date().toISOString();
  
  await cart.save();
  console.log('Cart ID:', cart.getId());
  console.log('Path ID:', cart.pathId);  // 'shopping_cart_id'
  
  // Create a product
  const product = new Product();
  product.productName = 'Awesome Widget';
  product.categoryId = 'widgets';
  product.imageURL = 'https://example.com/widget.jpg';
  product.priceInCents = 2999;  // $29.99
  
  await product.save();
  console.log('Product ID:', product.getId());
  console.log('Path ID:', product.pathId);  // 'custom_product_id'
  
  // Examine stored data
  console.log('User data:', user.getData());
  // {
  //   first_name: 'John',
  //   last_name: 'Doe', 
  //   email_address: 'john.doe@example.com',
  //   phone_number: '+1-555-0123'
  // }
  
  console.log('Cart data:', cart.getData());
  // {
  //   user_id: 'user123',
  //   cart_items: ['item1', 'item2', 'item3'],
  //   total_price: 99.99,
  //   discount_code: 'SAVE10',
  //   created_timestamp: '2023-12-01T10:00:00.000Z'
  // }
  
  console.log('Product data:', product.getData());
  // {
  //   product_name: 'Awesome Widget',
  //   category_id: 'widgets',
  //   image_u_r_l: 'https://example.com/widget.jpg',
  //   price_cents: 2999
  // }
}
```

## Benefits

1. **Cleaner Code**: No need to specify `path_id` for every model
2. **Consistent Naming**: Automatic snake_case conversion ensures database consistency
3. **Reduced Boilerplate**: Less configuration required for standard use cases
4. **Flexibility**: Can still override auto-generation when needed
5. **Backward Compatibility**: Existing models continue to work unchanged

## Migration Strategy

For existing projects, you can adopt these features gradually:

```typescript
// Phase 1: Enable auto field naming only
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: false  // Keep existing path_ids
});

// Phase 2: Enable auto path_id for new models
FirestoreOrmRepository.setGlobalConfig({
  auto_lower_case_field_name: true,
  auto_path_id: true
});

// Existing models keep explicit path_id, new models use auto-generation
```