import { FirestoreOrmRepository, Field, BaseModel, Model, toSnakeCase, classNameToPathId } from "../../index";

describe('Case Conversion Utilities', () => {
  test('toSnakeCase should convert camelCase to snake_case', () => {
    expect(toSnakeCase('cartItem')).toBe('cart_item');
    expect(toSnakeCase('userId')).toBe('user_id');
    expect(toSnakeCase('firstName')).toBe('first_name');
    expect(toSnakeCase('photoURL')).toBe('photo_u_r_l');
    expect(toSnakeCase('simpleField')).toBe('simple_field');
    expect(toSnakeCase('field')).toBe('field'); // single word
  });

  test('toSnakeCase should convert PascalCase to snake_case', () => {
    expect(toSnakeCase('UserModel')).toBe('user_model');
    expect(toSnakeCase('ShoppingCart')).toBe('shopping_cart');
    expect(toSnakeCase('HTTPRequest')).toBe('h_t_t_p_request');
  });

  test('classNameToPathId should convert class name to path_id format', () => {
    expect(classNameToPathId('User')).toBe('user_id');
    expect(classNameToPathId('ShoppingCart')).toBe('shopping_cart_id');
    expect(classNameToPathId('UserProfile')).toBe('user_profile_id');
    expect(classNameToPathId('HTTPRequest')).toBe('h_t_t_p_request_id');
  });

  test('classNameToPathId should not duplicate _id suffix', () => {
    expect(classNameToPathId('UserId')).toBe('user_id');
    expect(classNameToPathId('ShoppingCartId')).toBe('shopping_cart_id');
  });
});

describe('Global Configuration', () => {
  beforeEach(() => {
    // Reset global config before each test
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false,
      auto_path_id: false
    });
    // Clear registered path_ids before each test
    FirestoreOrmRepository.clearRegisteredPathIds();
  });

  test('should set and get global configuration', () => {
    const config = {
      auto_lower_case_field_name: true,
      auto_path_id: true
    };

    FirestoreOrmRepository.setGlobalConfig(config);
    const retrievedConfig = FirestoreOrmRepository.getGlobalConfig();

    expect(retrievedConfig.auto_lower_case_field_name).toBe(true);
    expect(retrievedConfig.auto_path_id).toBe(true);
  });

  test('should allow partial configuration updates', () => {
    // Set initial config
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: true,
      auto_path_id: false
    });

    // Update only one setting
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    const config = FirestoreOrmRepository.getGlobalConfig();
    expect(config.auto_lower_case_field_name).toBe(true);
    expect(config.auto_path_id).toBe(true);
  });
});

describe('Auto Lower Case Field Names', () => {
  beforeEach(() => {
    // Reset global config before each test
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false,
      auto_path_id: false
    });
    // Clear registered path_ids before each test
    FirestoreOrmRepository.clearRegisteredPathIds();
  });

  test('should use original field names when auto_lower_case_field_name is disabled', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public cartItem!: string;

      @Field({ is_required: false })
      public firstName?: string;
    }

    const model = new TestModel();
    
    // Field names should remain as-is
    expect(model.getFieldName('cartItem')).toBe('cartItem');
    expect(model.getFieldName('firstName')).toBe('firstName');
  });

  test('should convert field names to snake_case when auto_lower_case_field_name is enabled', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public cartItem!: string;

      @Field({ is_required: false })
      public firstName?: string;

      @Field({ is_required: false })
      public photoURL?: string;
    }

    const model = new TestModel();
    
    // Field names should be converted to snake_case
    expect(model.getFieldName('cartItem')).toBe('cart_item');
    expect(model.getFieldName('firstName')).toBe('first_name');
    expect(model.getFieldName('photoURL')).toBe('photo_u_r_l');
  });

  test('should respect explicit field_name over auto conversion', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ 
        is_required: true,
        field_name: 'custom_cart_field' // Explicit field name
      })
      public cartItem!: string;

      @Field({ is_required: false })
      public firstName?: string; // Should be auto-converted
    }

    const model = new TestModel();
    
    // Explicit field_name should be used as-is
    expect(model.getFieldName('cartItem')).toBe('custom_cart_field');
    // Auto conversion should apply when no explicit field_name
    expect(model.getFieldName('firstName')).toBe('first_name');
  });
});

describe('Auto Path ID', () => {
  beforeEach(() => {
    // Reset global config before each test
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false,
      auto_path_id: false
    });
    // Clear registered path_ids before each test
    FirestoreOrmRepository.clearRegisteredPathIds();
  });

  test('should throw error when path_id is missing and auto_path_id is disabled', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: false
    });

    expect(() => {
      @Model({
        reference_path: 'test_models'
        // No path_id provided
      })
      class TestModel extends BaseModel {
        @Field({ is_required: true })
        public name!: string;
      }
    }).toThrow("Model 'TestModel' must have a path_id defined in @Model decorator or enable auto_path_id in global configuration");
  });

  test('should auto-generate path_id from class name when auto_path_id is enabled', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    @Model({
      reference_path: 'users'
      // No path_id provided - should be auto-generated
    })
    class User extends BaseModel {
      @Field({ is_required: true })
      public name!: string;
    }

    @Model({
      reference_path: 'shopping_carts'
    })
    class ShoppingCart extends BaseModel {
      @Field({ is_required: true })
      public total!: number;
    }

    const user = new User();
    const cart = new ShoppingCart();

    expect(user.pathId).toBe('user_id');
    expect(cart.pathId).toBe('shopping_cart_id');
  });

  test('should respect explicit path_id over auto generation', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    @Model({
      reference_path: 'users',
      path_id: 'custom_user_id' // Explicit path_id
    })
    class User extends BaseModel {
      @Field({ is_required: true })
      public name!: string;
    }

    @Model({
      reference_path: 'products'
      // No path_id - should be auto-generated
    })
    class Product extends BaseModel {
      @Field({ is_required: true })
      public title!: string;
    }

    const user = new User();
    const product = new Product();

    // Explicit path_id should be used
    expect(user.pathId).toBe('custom_user_id');
    // Auto-generated path_id should be used
    expect(product.pathId).toBe('product_id');
  });

  test('should work with complex class names', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    @Model({
      reference_path: 'user_profiles'
    })
    class UserProfile extends BaseModel {
      @Field({ is_required: true })
      public bio!: string;
    }

    @Model({
      reference_path: 'http_requests'
    })
    class HTTPRequest extends BaseModel {
      @Field({ is_required: true })
      public url!: string;
    }

    const profile = new UserProfile();
    const request = new HTTPRequest();

    expect(profile.pathId).toBe('user_profile_id');
    expect(request.pathId).toBe('h_t_t_p_request_id');
  });
});

describe('Combined Functionality', () => {
  test('should work with both auto_lower_case_field_name and auto_path_id enabled', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: true,
      auto_path_id: true
    });

    @Model({
      reference_path: 'shopping_carts'
    })
    class ShoppingCart extends BaseModel {
      @Field({ is_required: true })
      public cartItem!: string;

      @Field({ is_required: false })
      public totalPrice?: number;

      @Field({ 
        is_required: false,
        field_name: 'custom_field' // Should override auto conversion
      })
      public someField?: string;
    }

    const cart = new ShoppingCart();

    // Path ID should be auto-generated
    expect(cart.pathId).toBe('shopping_cart_id');

    // Field names should be auto-converted except for explicit ones
    expect(cart.getFieldName('cartItem')).toBe('cart_item');
    expect(cart.getFieldName('totalPrice')).toBe('total_price');
    expect(cart.getFieldName('someField')).toBe('custom_field');
  });
});

describe('Path ID Uniqueness Validation', () => {
  beforeEach(() => {
    // Reset global config before each test
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false,
      auto_path_id: false
    });
    // Clear registered path_ids before each test
    FirestoreOrmRepository.clearRegisteredPathIds();
  });

  test('should throw error when explicit path_ids are duplicated', () => {
    // First model with path_id should work
    @Model({
      reference_path: 'users',
      path_id: 'user_id'
    })
    class User extends BaseModel {
      @Field({ is_required: true })
      public name!: string;
    }

    // Second model with same path_id should throw error
    expect(() => {
      @Model({
        reference_path: 'admins',
        path_id: 'user_id' // Duplicate path_id
      })
      class Admin extends BaseModel {
        @Field({ is_required: true })
        public role!: string;
      }
    }).toThrow("Path ID 'user_id' is already in use by another model. Each model must have a unique path_id. Model 'Admin' cannot use this path_id.");
  });

  test('should throw error when auto-generated path_ids conflict', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    // First model should work
    @Model({
      reference_path: 'users'
    })
    class User extends BaseModel {
      @Field({ is_required: true })
      public name!: string;
    }

    // Second model with same class name pattern should throw error
    expect(() => {
      @Model({
        reference_path: 'other_users'
        // This would auto-generate 'user_id' which conflicts
      })
      class User extends BaseModel {
        @Field({ is_required: true })
        public email!: string;
      }
    }).toThrow("Path ID 'user_id' is already in use by another model. Each model must have a unique path_id. Model 'User' cannot use this path_id.");
  });

  test('should throw error when explicit path_id conflicts with auto-generated', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    // First model with auto-generated path_id
    @Model({
      reference_path: 'users'
    })
    class User extends BaseModel {
      @Field({ is_required: true })
      public name!: string;
    }

    // Second model with explicit path_id that conflicts with auto-generated
    expect(() => {
      @Model({
        reference_path: 'products',
        path_id: 'user_id' // Conflicts with auto-generated 'user_id' from User class
      })
      class Product extends BaseModel {
        @Field({ is_required: true })
        public title!: string;
      }
    }).toThrow("Path ID 'user_id' is already in use by another model. Each model must have a unique path_id. Model 'Product' cannot use this path_id.");
  });

  test('should allow different path_ids without conflict', () => {
    // Multiple models with different path_ids should work fine
    expect(() => {
      @Model({
        reference_path: 'users',
        path_id: 'user_id'
      })
      class User extends BaseModel {
        @Field({ is_required: true })
        public name!: string;
      }

      @Model({
        reference_path: 'products',
        path_id: 'product_id'
      })
      class Product extends BaseModel {
        @Field({ is_required: true })
        public title!: string;
      }

      @Model({
        reference_path: 'orders',
        path_id: 'order_id'
      })
      class Order extends BaseModel {
        @Field({ is_required: true })
        public total!: number;
      }
    }).not.toThrow();
  });

  test('should work correctly with complex auto-generated path_ids', () => {
    FirestoreOrmRepository.setGlobalConfig({
      auto_path_id: true
    });

    expect(() => {
      @Model({
        reference_path: 'user_profiles'
      })
      class UserProfile extends BaseModel {
        @Field({ is_required: true })
        public bio!: string;
      }

      @Model({
        reference_path: 'shopping_carts'
      })
      class ShoppingCart extends BaseModel {
        @Field({ is_required: true })
        public items!: string[];
      }

      @Model({
        reference_path: 'http_requests'
      })
      class HTTPRequest extends BaseModel {
        @Field({ is_required: true })
        public url!: string;
      }
    }).not.toThrow();

    // Verify the path_ids are what we expect
    const profile = new UserProfile();
    const cart = new ShoppingCart();
    const request = new HTTPRequest();

    expect(profile.pathId).toBe('user_profile_id');
    expect(cart.pathId).toBe('shopping_cart_id');
    expect(request.pathId).toBe('h_t_t_p_request_id');
  });
});