import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";
import { config } from "../config";

// Create a test model for query testing
@Model({
  reference_path: 'test_items',
  path_id: 'item_id'
})
class TestItem extends BaseModel {
  @Field({
    is_required: true,
    is_text_indexing: true
  })
  public name!: string;

  @Field({
    is_required: false
  })
  public category?: string;

  @Field({
    is_required: false
  })
  public price?: number;

  @Field({
    is_required: false
  })
  public tags?: string[];
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

describe('Query Operations', () => {
  // Clean up test items before each test
  beforeEach(async () => {
    const items = await TestItem.getAll();
    for (const item of items) {
      await item.remove();
    }
  });

  test('should create and retrieve test items', async () => {
    // Create test items
    const item1 = new TestItem();
    item1.name = 'Test Item 1';
    item1.category = 'category1';
    item1.price = 10;
    await item1.save();

    const item2 = new TestItem();
    item2.name = 'Test Item 2';
    item2.category = 'category1';
    item2.price = 20;
    await item2.save();

    const item3 = new TestItem();
    item3.name = 'Test Item 3';
    item3.category = 'category2';
    item3.price = 30;
    await item3.save();

    // Check if items were created
    const allItems = await TestItem.getAll();
    expect(allItems.length).toBe(3);
  }, 10000);

  test('should query items with simple where clause', async () => {
    // Create test items
    const item1 = new TestItem();
    item1.name = 'First Item';
    item1.category = 'category1';
    item1.price = 10;
    await item1.save();

    const item2 = new TestItem();
    item2.name = 'Second Item';
    item2.category = 'category1';
    item2.price = 20;
    await item2.save();

    const item3 = new TestItem();
    item3.name = 'Third Item';
    item3.category = 'category2';
    item3.price = 30;
    await item3.save();

    // Query by category
    const category1Items = await TestItem.query().where('category', '==', 'category1').get();
    expect(category1Items.length).toBe(2);
    
    // Query by price
    const expensiveItems = await TestItem.query().where('price', '>', 20).get();
    expect(expensiveItems.length).toBe(1);
    expect(expensiveItems[0].name).toBe('Third Item');
  }, 10000);

  test('should query items with multiple where conditions', async () => {
    // Create test items
    const item1 = new TestItem();
    item1.name = 'First Product';
    item1.category = 'electronics';
    item1.price = 100;
    await item1.save();

    const item2 = new TestItem();
    item2.name = 'Second Product';
    item2.category = 'electronics';
    item2.price = 200;
    await item2.save();

    const item3 = new TestItem();
    item3.name = 'Third Product';
    item3.category = 'books';
    item3.price = 50;
    await item3.save();

    // Query with multiple conditions
    const results = await TestItem.query()
      .where('category', '==', 'electronics')
      .where('price', '>', 150)
      .get();
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Second Product');
  }, 10000);

  test('should query items with orWhere', async () => {
    // Create test items
    const item1 = new TestItem();
    item1.name = 'Phone';
    item1.category = 'electronics';
    item1.price = 500;
    await item1.save();

    const item2 = new TestItem();
    item2.name = 'Laptop';
    item2.category = 'electronics';
    item2.price = 1200;
    await item2.save();

    const item3 = new TestItem();
    item3.name = 'Book';
    item3.category = 'books';
    item3.price = 20;
    await item3.save();

    // Query with orWhere
    const results = await TestItem.query()
      .where('category', '==', 'electronics')
      .orWhere('price', '<', 50)
      .get();
    
    expect(results.length).toBe(3);
  }, 10000);

  test('should query items with like operator', async () => {
    // Create test items
    const item1 = new TestItem();
    item1.name = 'Apple iPhone';
    item1.category = 'electronics';
    await item1.save();

    const item2 = new TestItem();
    item2.name = 'Samsung Galaxy';
    item2.category = 'electronics';
    await item2.save();

    const item3 = new TestItem();
    item3.name = 'Learning JavaScript';
    item3.category = 'books';
    await item3.save();

    // Query with like
    const results = await TestItem.query()
      .like('name', '%Phone%')
      .get();
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Apple iPhone');
  }, 10000);

  test('should query items with orderBy and limit', async () => {
    // Create test items
    for (let i = 1; i <= 5; i++) {
      const item = new TestItem();
      item.name = `Item ${i}`;
      item.price = i * 10;
      await item.save();
    }

    // Query with orderBy and limit
    const results = await TestItem.query()
      .orderBy('price', 'desc')
      .limit(3)
      .get();
    
    expect(results.length).toBe(3);
    expect(results[0].price).toBe(50);
    expect(results[1].price).toBe(40);
    expect(results[2].price).toBe(30);
  }, 10000);

  test('should query with startAfter', async () => {
    // Create test items
    for (let i = 1; i <= 5; i++) {
      const item = new TestItem();
      item.name = `Product ${i}`;
      item.price = i * 100;
      await item.save();
    }

    // First query to get initial items
    const firstBatch = await TestItem.query()
      .orderBy('price', 'asc')
      .limit(2)
      .get();
    
    expect(firstBatch.length).toBe(2);
    
    // Query with startAfter using the last item from first batch
    const secondBatch = await TestItem.query()
      .orderBy('price', 'asc')
      .startAfter(firstBatch[1])
      .limit(2)
      .get();
    
    expect(secondBatch.length).toBe(2);
    expect(secondBatch[0].price).toBe(300);
    expect(secondBatch[1].price).toBe(400);
  }, 10000);

  test('should find an item using findOne', async () => {
    // Create test item
    const item = new TestItem();
    item.name = 'Unique Item';
    item.category = 'special';
    await item.save();
    
    // Find the item using findOne
    const foundItem = await TestItem.findOne('name', '==', 'Unique Item');
    
    expect(foundItem).not.toBeNull();
    expect(foundItem?.category).toBe('special');
  }, 10000);

  test('should find multiple items using find', async () => {
    // Create test items
    for (let i = 1; i <= 3; i++) {
      const item = new TestItem();
      item.name = `Searchable Item`;
      item.price = i * 10;
      await item.save();
    }
    
    // Find items using find
    const foundItems = await TestItem.find('name', '==', 'Searchable Item');
    
    expect(foundItems.length).toBe(3);
  }, 10000);
});