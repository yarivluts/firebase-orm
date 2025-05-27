import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";
import { config } from "../config";

// Define related models for testing relationships
@Model({
  reference_path: 'categories',
  path_id: 'category_id'
})
class Category extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public description?: string;
}

@Model({
  reference_path: 'products',
  path_id: 'product_id'
})
class RelProduct extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public price?: number;

  @Field({
    is_required: false,
    field_name: 'category_id'
  })
  public categoryId?: string;
}

@Model({
  reference_path: 'orders',
  path_id: 'order_id'
})
class Order extends BaseModel {
  @Field({
    is_required: true,
    field_name: 'order_number'
  })
  public orderNumber!: string;

  @Field({
    is_required: false,
  })
  public customerName?: string;

  @Field({
    is_required: false,
  })
  public orderDate?: string;

  @Field({
    is_required: false,
  })
  public items?: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  @Field({
    is_required: false,
  })
  public totalAmount?: number;
}

// Initialize Firebase for tests
let firebaseApp: any;
let connection: any;
let storage: any;

beforeAll(() => {
  // Initialize Firebase with test config
  firebaseApp = firebase.initializeApp(config.api.firebase);
  connection = firebaseApp.firestore();
  storage = firebaseApp.storage();

  // Initialize the ORM
  FirestoreOrmRepository.initGlobalConnection(connection);
  FirestoreOrmRepository.initGlobalStorage(storage);
});

describe('Model Relationships and Complex Data', () => {
  // Clean up test data before tests
  beforeEach(async () => {
    // Clean up orders
    const orders = await Order.getAll();
    for (const order of orders) {
      await order.remove();
    }
    
    // Clean up products
    const products = await RelProduct.getAll();
    for (const product of products) {
      await product.remove();
    }
    
    // Clean up categories
    const categories = await Category.getAll();
    for (const category of categories) {
      await category.remove();
    }
  });

  test('should handle one-to-many relationships', async () => {
    // Create a category
    const category = new Category();
    category.name = 'Electronics';
    category.description = 'Electronic devices and gadgets';
    await category.save();
    
    // Create products in that category
    const product1 = new RelProduct();
    product1.name = 'Smartphone';
    product1.price = 699;
    product1.categoryId = category.getId();
    await product1.save();
    
    const product2 = new RelProduct();
    product2.name = 'Laptop';
    product2.price = 1299;
    product2.categoryId = category.getId();
    await product2.save();
    
    // Query products by category ID
    const products = await RelProduct.query()
      .where('category_id', '==', category.getId())
      .get();
    
    // Check that we found the products in the category
    expect(products.length).toBe(2);
    expect(products.map(p => p.name).sort()).toEqual(['Laptop', 'Smartphone']);
  }, 15000);

  test('should handle complex data structures', async () => {
    // Create products
    const product1 = new RelProduct();
    product1.name = 'Widget A';
    product1.price = 10;
    await product1.save();
    
    const product2 = new RelProduct();
    product2.name = 'Widget B';
    product2.price = 15;
    await product2.save();
    
    // Create an order with multiple items
    const order = new Order();
    order.orderNumber = 'ORD-2023-001';
    order.customerName = 'John Doe';
    order.orderDate = new Date().toISOString();
    order.items = [
      {
        productId: product1.getId(),
        quantity: 2,
        price: product1.price || 0
      },
      {
        productId: product2.getId(),
        quantity: 1,
        price: product2.price || 0
      }
    ];
    order.totalAmount = (2 * (product1.price || 0)) + (1 * (product2.price || 0));
    
    // Save the order
    await order.save();
    
    // Retrieve the order and verify its data
    const retrievedOrder = new Order();
    await retrievedOrder.load(order.getId());
    
    // Check order properties
    expect(retrievedOrder.orderNumber).toBe('ORD-2023-001');
    expect(retrievedOrder.customerName).toBe('John Doe');
    expect(retrievedOrder.totalAmount).toBe(35);
    
    // Check order items
    expect(retrievedOrder.items?.length).toBe(2);
    expect(retrievedOrder.items?.[0].quantity).toBe(2);
    expect(retrievedOrder.items?.[0].price).toBe(10);
    expect(retrievedOrder.items?.[1].quantity).toBe(1);
    expect(retrievedOrder.items?.[1].price).toBe(15);
  }, 15000);

  test('should fetch related data through multiple queries', async () => {
    // Create categories
    const electronicsCategory = new Category();
    electronicsCategory.name = 'Electronics';
    await electronicsCategory.save();
    
    const booksCategory = new Category();
    booksCategory.name = 'Books';
    await booksCategory.save();
    
    // Create products in different categories
    const phone = new RelProduct();
    phone.name = 'Phone';
    phone.price = 599;
    phone.categoryId = electronicsCategory.getId();
    await phone.save();
    
    const book = new RelProduct();
    book.name = 'Book';
    book.price = 25;
    book.categoryId = booksCategory.getId();
    await book.save();
    
    // Create an order with items from both categories
    const order = new Order();
    order.orderNumber = 'ORD-2023-002';
    order.customerName = 'Jane Smith';
    order.items = [
      {
        productId: phone.getId(),
        quantity: 1,
        price: phone.price || 0
      },
      {
        productId: book.getId(),
        quantity: 2,
        price: book.price || 0
      }
    ];
    order.totalAmount = (1 * (phone.price || 0)) + (2 * (book.price || 0));
    await order.save();
    
    // Fetch the order
    const fetchedOrder = new Order();
    await fetchedOrder.load(order.getId());
    
    // Now we'll fetch each product in the order
    const orderProducts = [];
    for (const item of fetchedOrder.items || []) {
      const product = new RelProduct();
      await product.load(item.productId);
      orderProducts.push({
        product,
        quantity: item.quantity
      });
    }
    
    // Then fetch each product's category
    const productData = [];
    for (const item of orderProducts) {
      const product = item.product;
      let category = null;
      
      if (product.categoryId) {
        category = new Category();
        await category.load(product.categoryId);
      }
      
      productData.push({
        productName: product.name,
        quantity: item.quantity,
        categoryName: category?.name
      });
    }
    
    // Verify we have the correct relationship data
    expect(productData.length).toBe(2);
    expect(productData.find(p => p.productName === 'Phone')?.categoryName).toBe('Electronics');
    expect(productData.find(p => p.productName === 'Book')?.categoryName).toBe('Books');
    expect(productData.find(p => p.productName === 'Phone')?.quantity).toBe(1);
    expect(productData.find(p => p.productName === 'Book')?.quantity).toBe(2);
  }, 15000);
});