# Common Patterns

This guide covers frequently used patterns and solutions when working with Firebase ORM.

## CRUD Operations

### Standard CRUD Pattern

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public price!: number;

  @Field({ is_required: false })
  public description?: string;

  @Field({ field_name: "created_at" })
  public createdAt?: string;

  @Field({ field_name: "updated_at" })
  public updatedAt?: string;
}

// CRUD Service
export class ProductService {
  // Create
  async createProduct(data: Partial<Product>): Promise<Product> {
    const product = new Product();
    Object.assign(product, data);
    product.createdAt = new Date().toISOString();
    product.updatedAt = new Date().toISOString();
    
    return await product.save();
  }

  // Read
  async getProduct(id: string): Promise<Product> {
    const product = await Product.init(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return await Product.getAll();
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await Product.query()
      .where('category', '==', category)
      .orderBy('createdAt', 'desc')
      .get();
  }

  // Update
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const product = await this.getProduct(id);
    Object.assign(product, updates);
    product.updatedAt = new Date().toISOString();
    
    return await product.save();
  }

  // Delete
  async deleteProduct(id: string): Promise<void> {
    const product = await this.getProduct(id);
    await product.destroy();
  }

  // Soft Delete
  async softDeleteProduct(id: string): Promise<Product> {
    return await this.updateProduct(id, { 
      deletedAt: new Date().toISOString() 
    });
  }
}
```

## Repository Pattern

### Generic Repository

```typescript
export interface IRepository<T extends BaseModel> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  findBy(field: string, value: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export class BaseRepository<T extends BaseModel> implements IRepository<T> {
  constructor(private ModelClass: new () => T) {}

  async findById(id: string): Promise<T> {
    const model = await (this.ModelClass as any).init(id);
    if (!model) {
      throw new Error('Model not found');
    }
    return model;
  }

  async findAll(): Promise<T[]> {
    return await (this.ModelClass as any).getAll();
  }

  async findBy(field: string, value: any): Promise<T[]> {
    return await (this.ModelClass as any).query()
      .where(field, '==', value)
      .get();
  }

  async create(data: Partial<T>): Promise<T> {
    const model = new this.ModelClass();
    Object.assign(model, data);
    return await model.save();
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const model = await this.findById(id);
    Object.assign(model, data);
    return await model.save();
  }

  async delete(id: string): Promise<void> {
    const model = await this.findById(id);
    await model.destroy();
  }
}

// Specific repository
export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(Product);
  }

  async findByPriceRange(min: number, max: number): Promise<Product[]> {
    return await Product.query()
      .where('price', '>=', min)
      .where('price', '<=', max)
      .get();
  }

  async findInStock(): Promise<Product[]> {
    return await Product.query()
      .where('quantity', '>', 0)
      .get();
  }

  async findFeatured(): Promise<Product[]> {
    return await Product.query()
      .where('isFeatured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
  }
}
```

## Pagination Patterns

### Cursor-Based Pagination

```typescript
export interface PaginationResult<T> {
  items: T[];
  hasNext: boolean;
  nextCursor?: string;
  total?: number;
}

export class PaginationService {
  static async paginate<T extends BaseModel>(
    ModelClass: new () => T,
    options: {
      limit?: number;
      cursor?: string;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      where?: Array<{ field: string; operator: string; value: any }>;
    }
  ): Promise<PaginationResult<T>> {
    const limit = options.limit || 20;
    const orderBy = options.orderBy || 'createdAt';
    const orderDirection = options.orderDirection || 'desc';

    let query = (ModelClass as any).query()
      .orderBy(orderBy, orderDirection)
      .limit(limit + 1); // Get one extra to check if there's more

    // Apply where conditions
    if (options.where) {
      options.where.forEach(condition => {
        query = query.where(condition.field, condition.operator, condition.value);
      });
    }

    // Apply cursor
    if (options.cursor) {
      if (orderDirection === 'desc') {
        query = query.startAfter(options.cursor);
      } else {
        query = query.startAfter(options.cursor);
      }
    }

    const results = await query.get();
    const hasNext = results.length > limit;
    
    if (hasNext) {
      results.pop(); // Remove the extra item
    }

    const nextCursor = hasNext && results.length > 0 
      ? results[results.length - 1][orderBy]
      : undefined;

    return {
      items: results,
      hasNext,
      nextCursor
    };
  }
}

// Usage
const paginateProducts = async (cursor?: string) => {
  return await PaginationService.paginate(Product, {
    limit: 10,
    cursor,
    orderBy: 'createdAt',
    orderDirection: 'desc',
    where: [{ field: 'isActive', operator: '==', value: true }]
  });
};
```

### Offset-Based Pagination

```typescript
export interface OffsetPaginationResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class OffsetPaginationService {
  static async paginate<T extends BaseModel>(
    ModelClass: new () => T,
    page: number = 1,
    limit: number = 20,
    options?: {
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      where?: Array<{ field: string; operator: string; value: any }>;
    }
  ): Promise<OffsetPaginationResult<T>> {
    const offset = (page - 1) * limit;
    const orderBy = options?.orderBy || 'createdAt';
    const orderDirection = options?.orderDirection || 'desc';

    let query = (ModelClass as any).query()
      .orderBy(orderBy, orderDirection);

    // Apply where conditions
    if (options?.where) {
      options.where.forEach(condition => {
        query = query.where(condition.field, condition.operator, condition.value);
      });
    }

    // Get total count (for offset pagination, we need total count)
    const allResults = await query.get();
    const total = allResults.length;

    // Apply pagination
    const items = allResults.slice(offset, offset + limit);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }
}
```

## Search Patterns

### Full-Text Search with Indexing

```typescript
@Model({
  reference_path: "articles",
  path_id: "article_id"
})
export class Article extends BaseModel {
  @Field({ 
    is_required: true,
    is_text_indexing: true 
  })
  public title!: string;

  @Field({ 
    is_required: true,
    is_text_indexing: true 
  })
  public content!: string;

  @Field({ is_required: false })
  public tags?: string[];

  @Field({ field_name: "search_keywords" })
  public searchKeywords?: string[];

  // Generate search keywords when saving
  async beforeSave(): Promise<void> {
    this.generateSearchKeywords();
  }

  private generateSearchKeywords(): void {
    const keywords = new Set<string>();
    
    // Add title words
    this.title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length >= 3) {
        keywords.add(word);
      }
    });

    // Add content words (first 100 words)
    const contentWords = this.content.toLowerCase()
      .split(/\s+/)
      .slice(0, 100);
    
    contentWords.forEach(word => {
      if (word.length >= 3) {
        keywords.add(word);
      }
    });

    // Add tags
    this.tags?.forEach(tag => {
      keywords.add(tag.toLowerCase());
    });

    this.searchKeywords = Array.from(keywords);
  }
}

export class SearchService {
  async searchArticles(query: string): Promise<Article[]> {
    const searchTerms = query.toLowerCase().split(/\s+/)
      .filter(term => term.length >= 3);

    if (searchTerms.length === 0) {
      return [];
    }

    // Search using LIKE operator
    const results = await Article.query()
      .like('title', `%${query}%`)
      .get();

    // Also search in keywords
    const keywordResults = await Article.query()
      .where('searchKeywords', 'array-contains-any', searchTerms)
      .get();

    // Combine and deduplicate results
    const allResults = [...results, ...keywordResults];
    const uniqueResults = allResults.filter((article, index, array) => 
      array.findIndex(a => a.getId() === article.getId()) === index
    );

    return this.rankSearchResults(uniqueResults, query);
  }

  private rankSearchResults(articles: Article[], query: string): Article[] {
    const queryLower = query.toLowerCase();
    
    return articles
      .map(article => ({
        article,
        score: this.calculateRelevanceScore(article, queryLower)
      }))
      .sort((a, b) => b.score - a.score)
      .map(result => result.article);
  }

  private calculateRelevanceScore(article: Article, query: string): number {
    let score = 0;
    
    // Title matches are worth more
    if (article.title.toLowerCase().includes(query)) {
      score += 10;
    }
    
    // Content matches
    if (article.content.toLowerCase().includes(query)) {
      score += 5;
    }
    
    // Tag matches
    article.tags?.forEach(tag => {
      if (tag.toLowerCase().includes(query)) {
        score += 7;
      }
    });
    
    return score;
  }
}
```

## Caching Patterns

### Model-Level Caching

```typescript
export class CacheService {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static set(key: string, data: any, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  static invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  static clear(): void {
    this.cache.clear();
  }
}

// Cached model mixin
export class CachedBaseModel extends BaseModel {
  async load(id: string): Promise<this> {
    const cacheKey = `${this.constructor.name}_${id}`;
    const cached = CacheService.get<any>(cacheKey);
    
    if (cached) {
      Object.assign(this, cached);
      return this;
    }

    await super.load(id);
    CacheService.set(cacheKey, this.toJSON(), 300000); // Cache for 5 minutes
    return this;
  }

  async save(): Promise<this> {
    const result = await super.save();
    
    // Invalidate cache
    const cacheKey = `${this.constructor.name}_${this.getId()}`;
    CacheService.invalidate(cacheKey);
    
    return result;
  }

  async destroy(): Promise<void> {
    await super.destroy();
    
    // Invalidate cache
    const cacheKey = `${this.constructor.name}_${this.getId()}`;
    CacheService.invalidate(cacheKey);
  }
}
```

### Query Result Caching

```typescript
export class QueryCacheService {
  private static cache = new Map<string, any>();

  static async getCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data;
    }

    const result = await queryFn();
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  static invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
export class ProductService {
  async getProductsByCategory(category: string): Promise<Product[]> {
    const cacheKey = `products_category_${category}`;
    
    return QueryCacheService.getCachedQuery(
      cacheKey,
      () => Product.query()
        .where('category', '==', category)
        .where('isActive', '==', true)
        .get(),
      300000 // 5 minutes
    );
  }

  async invalidateProductCache(category?: string): Promise<void> {
    if (category) {
      QueryCacheService.invalidatePattern(`products_category_${category}`);
    } else {
      QueryCacheService.invalidatePattern('products_.*');
    }
  }
}
```

## Event-Driven Patterns

### Observer Pattern

```typescript
export interface ModelEventListener<T extends BaseModel> {
  beforeSave?(model: T): Promise<void> | void;
  afterSave?(model: T): Promise<void> | void;
  beforeDestroy?(model: T): Promise<void> | void;
  afterDestroy?(model: T): Promise<void> | void;
}

export class EventManager {
  private static listeners = new Map<string, ModelEventListener<any>[]>();

  static addListener<T extends BaseModel>(
    modelName: string, 
    listener: ModelEventListener<T>
  ): void {
    if (!this.listeners.has(modelName)) {
      this.listeners.set(modelName, []);
    }
    this.listeners.get(modelName)!.push(listener);
  }

  static async emit<T extends BaseModel>(
    modelName: string,
    event: keyof ModelEventListener<T>,
    model: T
  ): Promise<void> {
    const listeners = this.listeners.get(modelName) || [];
    
    for (const listener of listeners) {
      const handler = listener[event];
      if (handler) {
        await handler.call(listener, model);
      }
    }
  }
}

// Enhanced base model with events
export class EventfulBaseModel extends BaseModel {
  async save(): Promise<this> {
    await EventManager.emit(this.constructor.name, 'beforeSave', this);
    const result = await super.save();
    await EventManager.emit(this.constructor.name, 'afterSave', this);
    return result;
  }

  async destroy(): Promise<void> {
    await EventManager.emit(this.constructor.name, 'beforeDestroy', this);
    await super.destroy();
    await EventManager.emit(this.constructor.name, 'afterDestroy', this);
  }
}

// Example listeners
class ProductEventListener implements ModelEventListener<Product> {
  async afterSave(product: Product): Promise<void> {
    // Invalidate cache
    await ProductService.invalidateProductCache(product.category);
    
    // Send notification
    await NotificationService.send({
      type: 'product_updated',
      productId: product.getId(),
      productName: product.name
    });
  }

  async afterDestroy(product: Product): Promise<void> {
    // Clean up related data
    await ImageService.deleteProductImages(product.getId());
  }
}

// Register listeners
EventManager.addListener('Product', new ProductEventListener());
```

## Validation Patterns

### Decorator-Based Validation

```typescript
// Validation decorators
export function Required(message?: string) {
  return function (target: any, propertyKey: string) {
    const validations = Reflect.getMetadata('validations', target) || [];
    validations.push({
      property: propertyKey,
      validator: (value: any) => value != null && value !== '',
      message: message || `${propertyKey} is required`
    });
    Reflect.defineMetadata('validations', validations, target);
  };
}

export function MinLength(min: number, message?: string) {
  return function (target: any, propertyKey: string) {
    const validations = Reflect.getMetadata('validations', target) || [];
    validations.push({
      property: propertyKey,
      validator: (value: string) => !value || value.length >= min,
      message: message || `${propertyKey} must be at least ${min} characters`
    });
    Reflect.defineMetadata('validations', validations, target);
  };
}

export function Email(message?: string) {
  return function (target: any, propertyKey: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validations = Reflect.getMetadata('validations', target) || [];
    validations.push({
      property: propertyKey,
      validator: (value: string) => !value || emailRegex.test(value),
      message: message || `${propertyKey} must be a valid email`
    });
    Reflect.defineMetadata('validations', validations, target);
  };
}

// Validatable base model
export class ValidatableBaseModel extends BaseModel {
  async validate(): Promise<void> {
    const validations = Reflect.getMetadata('validations', this) || [];
    const errors: string[] = [];

    for (const validation of validations) {
      const value = (this as any)[validation.property];
      if (!validation.validator(value)) {
        errors.push(validation.message);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  async save(): Promise<this> {
    await this.validate();
    return super.save();
  }
}

// Usage
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends ValidatableBaseModel {
  @Field({ is_required: true })
  @Required('Name is required')
  @MinLength(2, 'Name must be at least 2 characters')
  public name!: string;

  @Field({ is_required: true })
  @Required('Email is required')
  @Email('Please provide a valid email')
  public email!: string;
}
```

## Factory Pattern

### Model Factory

```typescript
export class ModelFactory {
  static create<T extends BaseModel>(
    ModelClass: new () => T,
    data: Partial<T>
  ): T {
    const model = new ModelClass();
    Object.assign(model, data);
    return model;
  }

  static async createAndSave<T extends BaseModel>(
    ModelClass: new () => T,
    data: Partial<T>
  ): Promise<T> {
    const model = this.create(ModelClass, data);
    return await model.save();
  }

  static createMultiple<T extends BaseModel>(
    ModelClass: new () => T,
    dataArray: Array<Partial<T>>
  ): T[] {
    return dataArray.map(data => this.create(ModelClass, data));
  }

  static async createMultipleAndSave<T extends BaseModel>(
    ModelClass: new () => T,
    dataArray: Array<Partial<T>>
  ): Promise<T[]> {
    const models = this.createMultiple(ModelClass, dataArray);
    return await Promise.all(models.map(model => model.save()));
  }
}

// Test data factory
export class TestDataFactory {
  static createUser(overrides?: Partial<User>): User {
    return ModelFactory.create(User, {
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      ...overrides
    });
  }

  static createProduct(overrides?: Partial<Product>): Product {
    return ModelFactory.create(Product, {
      name: 'Test Product',
      price: 99.99,
      category: 'electronics',
      ...overrides
    });
  }

  static async seedDatabase(): Promise<void> {
    // Create test users
    const users = await ModelFactory.createMultipleAndSave(User, [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
      { name: 'Admin User', email: 'admin@example.com', role: 'admin' }
    ]);

    // Create test products
    await ModelFactory.createMultipleAndSave(Product, [
      { name: 'Laptop', price: 999.99, category: 'electronics' },
      { name: 'Book', price: 19.99, category: 'books' },
      { name: 'Coffee Mug', price: 9.99, category: 'home' }
    ]);
  }
}
```

## Error Handling Patterns

### Result Pattern

```typescript
export class Result<T, E = Error> {
  private constructor(
    private readonly success: boolean,
    private readonly data?: T,
    private readonly error?: E
  ) {}

  static ok<T>(data: T): Result<T> {
    return new Result(true, data);
  }

  static error<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }

  isOk(): boolean {
    return this.success;
  }

  isError(): boolean {
    return !this.success;
  }

  getData(): T {
    if (!this.success) {
      throw new Error('Cannot get data from error result');
    }
    return this.data!;
  }

  getError(): E {
    if (this.success) {
      throw new Error('Cannot get error from success result');
    }
    return this.error!;
  }

  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this.success) {
      return Result.ok(fn(this.data!));
    }
    return Result.error(this.error!);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (!this.success) {
      return Result.error(fn(this.error!));
    }
    return Result.ok(this.data!);
  }
}

// Service with Result pattern
export class SafeProductService {
  async getProduct(id: string): Promise<Result<Product, string>> {
    try {
      const product = await Product.init(id);
      if (!product) {
        return Result.error('Product not found');
      }
      return Result.ok(product);
    } catch (error) {
      return Result.error('Product not found');
    }
  }

  async createProduct(data: Partial<Product>): Promise<Result<Product, string>> {
    try {
      const product = ModelFactory.create(Product, data);
      await product.save();
      return Result.ok(product);
    } catch (error) {
      return Result.error(`Failed to create product: ${error.message}`);
    }
  }
}

// Usage
const productService = new SafeProductService();

const result = await productService.getProduct('invalid-id');
if (result.isOk()) {
  const product = result.getData();
  console.log(product.name);
} else {
  console.error(result.getError());
}
```