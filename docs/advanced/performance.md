# Performance Optimization

This guide covers best practices and techniques for optimizing the performance of your Firebase ORM applications.

## Database Design Optimization

### Efficient Data Modeling

```typescript
// ✅ Good: Denormalized data for read optimization
@Model({
  reference_path: "user_posts",
  path_id: "post_id"
})
export class UserPost extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  // Denormalized user data for efficient reads
  @Field({ field_name: "author_name" })
  public authorName!: string;

  @Field({ field_name: "author_avatar" })
  public authorAvatar?: string;

  @Field({ field_name: "user_id" })
  public userId!: string;
}

// ❌ Avoid: Over-normalization requiring many joins
@Model({
  reference_path: "posts",
  path_id: "post_id"
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ field_name: "user_id" })
  public userId!: string;
  // Requires additional query to get user details
}
```

### Optimize Collection Structure

```typescript
// ✅ Good: Hierarchical structure for related data
@Model({
  reference_path: "websites/:website_id/pages",
  path_id: "page_id"
})
export class WebsitePage extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;
}

// Usage: Automatically scoped to website
const website = await Website.findOne('domain', '==', 'example.com');
const pages = await website.getModel(WebsitePage).getAll(); // Efficient subcollection query
```

### Field Optimization

```typescript
@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  // ✅ Index frequently queried fields
  @Field({ 
    is_required: true,
    is_text_indexing: true  // Enable for search
  })
  public name!: string;

  @Field({ is_required: true })
  public price!: number;

  @Field({ is_required: true })
  public category!: string;

  // ✅ Use appropriate field names
  @Field({ field_name: "created_at" })
  public createdAt!: string;

  // ❌ Avoid: Large objects that aren't frequently accessed
  // Store these in separate documents or use lazy loading
  @Field({ is_required: false })
  public detailedSpecs?: any; // Keep this small or move to separate model
}
```

## Query Optimization

### Efficient Query Patterns

```typescript
// ✅ Good: Use compound queries with proper indexing
const getActiveProductsByCategory = async (category: string) => {
  return await Product.query()
    .where('category', '==', category)
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
};

// ✅ Good: Use pagination for large datasets
const getProductsPaginated = async (lastDoc?: Product, limit: number = 20) => {
  let query = Product.query()
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (lastDoc) {
    query = query.startAfter(lastDoc.createdAt);
  }

  return await query.get();
};

// ❌ Avoid: Loading all data then filtering
const getAllProducts = async () => {
  const allProducts = await Product.getAll(); // Expensive!
  return allProducts.filter(p => p.isActive); // Client-side filtering
};
```

### Query Caching

```typescript
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 300000) { // 5 min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

const queryCache = new QueryCache();

const getCachedProducts = async (category: string): Promise<Product[]> => {
  const cacheKey = `products_${category}`;
  
  let products = queryCache.get(cacheKey);
  if (products) {
    return products;
  }

  products = await Product.query()
    .where('category', '==', category)
    .where('isActive', '==', true)
    .get();

  queryCache.set(cacheKey, products, 300000); // Cache for 5 minutes
  return products;
};
```

### Batch Operations

```typescript
// ✅ Good: Batch multiple operations
const createMultipleProducts = async (productData: any[]) => {
  const promises = productData.map(async (data) => {
    const product = new Product();
    Object.assign(product, data);
    return product.save();
  });

  // Execute all saves in parallel
  return await Promise.all(promises);
};

// ✅ Good: Batch relationship loading
const loadUsersWithPosts = async (userIds: string[]) => {
  // Load all users in parallel
  const userPromises = userIds.map(id => {
    const user = new User();
    return user.load(id);
  });
  
  const users = await Promise.all(userPromises);

  // Load posts for all users in parallel
  const postsPromises = users.map(user => user.loadHasMany('posts'));
  await Promise.all(postsPromises);

  return users;
};
```

## Memory Management

### Efficient Model Loading

```typescript
// ✅ Good: Load only required fields
const getProductSummaries = async () => {
  const products = await Product.query()
    .select(['name', 'price', 'category']) // Only load needed fields
    .where('isActive', '==', true)
    .get();

  return products.map(p => ({
    id: p.getId(),
    name: p.name,
    price: p.price,
    category: p.category
  }));
};

// ✅ Good: Lazy loading for relationships
class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  private _posts?: Post[];

  async getPosts(): Promise<Post[]> {
    if (!this._posts) {
      this._posts = await this.loadHasMany('posts');
    }
    return this._posts;
  }

  clearPostsCache() {
    this._posts = undefined;
  }
}
```

### Memory Pool Management

```typescript
class ModelPool<T extends BaseModel> {
  private pool: T[] = [];
  private maxSize: number;
  private createFn: () => T;

  constructor(createFn: () => T, maxSize: number = 50) {
    this.createFn = createFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(model: T) {
    if (this.pool.length < this.maxSize) {
      // Reset model state
      model.clearCache?.();
      this.pool.push(model);
    }
  }
}

// Usage
const userPool = new ModelPool(() => new User(), 20);

const processUsers = async (userIds: string[]) => {
  const results = [];
  
  for (const id of userIds) {
    const user = userPool.acquire();
    try {
      const loadedUser = await User.init(id);
      if (loadedUser) {
        // Copy data to pooled instance
        Object.assign(user, loadedUser);
        // Process user
        results.push(user.name);
      }
    } finally {
      userPool.release(user);
    }
  }
  
  return results;
};
```

## Real-time Optimization

### Selective Subscriptions

```typescript
// ✅ Good: Subscribe only to necessary data
const subscribeToActiveProducts = (callback: (products: Product[]) => void) => {
  return Product.query()
    .where('isActive', '==', true)
    .where('category', '==', 'electronics') // Narrow scope
    .orderBy('updatedAt', 'desc')
    .limit(10) // Limit subscription size
    .onSnapshot(callback);
};

// ✅ Good: Unsubscribe when component unmounts
class ProductComponent {
  private unsubscribe?: () => void;

  componentDidMount() {
    this.unsubscribe = subscribeToActiveProducts((products) => {
      this.setState({ products });
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

### Connection Pooling

```typescript
class ConnectionManager {
  private maxConnections = 10;
  private activeConnections = 0;
  private queue: Array<() => void> = [];

  async executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        if (this.activeConnections >= this.maxConnections) {
          this.queue.push(execute);
          return;
        }

        this.activeConnections++;
        try {
          const result = await queryFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeConnections--;
          const next = this.queue.shift();
          if (next) next();
        }
      };

      execute();
    });
  }
}

const connectionManager = new ConnectionManager();

// Usage
const getProducts = async () => {
  return connectionManager.executeQuery(() => 
    Product.query().where('isActive', '==', true).get()
  );
};
```

## Client-Side Optimization

### Data Preloading

```typescript
// Preload commonly accessed data
class DataPreloader {
  private preloadedData = new Map<string, any>();

  async preloadCategories() {
    const categories = await Category.getAll();
    this.preloadedData.set('categories', categories);
  }

  async preloadUserProfile(userId: string) {
    const user = await User.init(userId);
    if (user) {
      await user.loadWithRelationships(['profile', 'preferences']);
      this.preloadedData.set(`user_${userId}`, user);
    }
  }

  getPreloadedData(key: string) {
    return this.preloadedData.get(key);
  }
}

const preloader = new DataPreloader();

// Initialize app
const initializeApp = async () => {
  await Promise.all([
    preloader.preloadCategories(),
    preloader.preloadUserProfile(getCurrentUserId())
  ]);
};
```

### Virtual Scrolling for Large Lists

```typescript
class VirtualizedProductList {
  private visibleStart = 0;
  private visibleEnd = 20;
  private itemHeight = 100;
  private containerHeight = 600;
  private products: Product[] = [];

  async loadMoreProducts() {
    const newProducts = await Product.query()
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .startAfter(this.products[this.products.length - 1]?.createdAt)
      .limit(20)
      .get();

    this.products.push(...newProducts);
  }

  getVisibleItems() {
    return this.products.slice(this.visibleStart, this.visibleEnd);
  }

  updateVisibleRange(scrollTop: number) {
    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = this.visibleStart + Math.ceil(this.containerHeight / this.itemHeight);
    
    // Load more if near end
    if (this.visibleEnd > this.products.length - 5) {
      this.loadMoreProducts();
    }
  }
}
```

## Network Optimization

### Request Batching

```typescript
class RequestBatcher {
  private batches = new Map<string, any[]>();
  private timers = new Map<string, NodeJS.Timeout>();

  batch<T>(key: string, request: () => Promise<T>, delay: number = 100): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(key)) {
        this.batches.set(key, []);
      }

      this.batches.get(key)!.push({ resolve, reject, request });

      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      // Set new timer
      this.timers.set(key, setTimeout(() => {
        this.executeBatch(key);
      }, delay));
    });
  }

  private async executeBatch(key: string) {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);
    this.timers.delete(key);

    // Execute all requests in parallel
    const promises = batch.map(({ request, resolve, reject }) => 
      request().then(resolve).catch(reject)
    );

    await Promise.allSettled(promises);
  }
}

const batcher = new RequestBatcher();

// Usage
const loadUser = (id: string) => 
  batcher.batch(`user_${id}`, () => {
    const user = new User();
    return user.load(id);
  });
```

### Compression and Serialization

```typescript
// Optimize data transfer
class DataOptimizer {
  static compressModel(model: BaseModel): any {
    const data = model.toJSON();
    
    // Remove null/undefined values
    const compressed = Object.keys(data).reduce((acc, key) => {
      if (data[key] != null) {
        acc[key] = data[key];
      }
      return acc;
    }, {} as any);

    return compressed;
  }

  static decompressModel<T extends BaseModel>(
    data: any, 
    ModelClass: new () => T
  ): T {
    const model = new ModelClass();
    Object.assign(model, data);
    return model;
  }

  static batchCompress(models: BaseModel[]): any[] {
    return models.map(model => this.compressModel(model));
  }
}
```

## Monitoring and Analytics

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const measurements = this.metrics.get(operation)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  getAverageTime(operation: string): number {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  getReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [operation, measurements] of this.metrics) {
      report[operation] = {
        count: measurements.length,
        average: this.getAverageTime(operation),
        min: Math.min(...measurements),
        max: Math.max(...measurements)
      };
    }
    
    return report;
  }
}

const monitor = new PerformanceMonitor();

// Usage
const getProducts = async () => {
  const endTimer = monitor.startTimer('Product.query');
  
  try {
    const products = await Product.query()
      .where('isActive', '==', true)
      .get();
    return products;
  } finally {
    endTimer();
  }
};
```

### Memory Usage Tracking

```typescript
class MemoryTracker {
  private snapshots: Array<{ timestamp: number; usage: any }> = [];

  takeSnapshot(label?: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const memory = (performance as any).memory;
      if (memory) {
        this.snapshots.push({
          timestamp: Date.now(),
          usage: {
            label,
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        });
      }
    }
  }

  getMemoryTrend() {
    return this.snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      usedMB: Math.round(snapshot.usage.usedJSHeapSize / 1024 / 1024),
      label: snapshot.usage.label
    }));
  }

  detectMemoryLeaks() {
    if (this.snapshots.length < 3) return false;
    
    const recent = this.snapshots.slice(-3);
    const trend = recent.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.usage.usedJSHeapSize > recent[index - 1].usage.usedJSHeapSize;
    });
    
    return trend; // Consistently increasing memory usage
  }
}

const memoryTracker = new MemoryTracker();

// Usage
setInterval(() => {
  memoryTracker.takeSnapshot();
  
  if (memoryTracker.detectMemoryLeaks()) {
    console.warn('Potential memory leak detected');
  }
}, 30000); // Check every 30 seconds
```

## Best Practices Summary

### 1. Database Design
- Use denormalization for read-heavy operations
- Design hierarchical structures for related data
- Index frequently queried fields
- Keep document sizes reasonable

### 2. Query Optimization
- Use compound queries with proper indexing
- Implement pagination for large datasets
- Cache frequently accessed data
- Batch multiple operations

### 3. Memory Management
- Load only required fields
- Implement lazy loading for relationships
- Use object pooling for frequently created models
- Clear caches when appropriate

### 4. Real-time Features
- Subscribe only to necessary data
- Limit subscription scope and size
- Unsubscribe when components unmount
- Use connection pooling

### 5. Client-Side Performance
- Preload commonly accessed data
- Implement virtual scrolling for large lists
- Batch network requests
- Compress data transfer

### 6. Monitoring
- Track query performance
- Monitor memory usage
- Detect potential memory leaks
- Generate performance reports

### 7. Error Handling
- Implement retry logic for failed operations
- Use circuit breakers for external services
- Handle offline scenarios gracefully
- Log performance metrics for analysis