# Firebase Functions Integration

Firebase ORM works seamlessly with Firebase Functions, enabling you to build powerful server-side applications with the same elegant patterns you use on the client side.

## Why Use Firebase ORM with Functions?

- **Consistent API**: Same model definitions work in both client and server code
- **Type Safety**: Full TypeScript support for server-side operations
- **Real-time Sync**: Automatically sync data changes with connected clients
- **Security**: Server-side validation and data processing
- **Background Processing**: Handle complex operations without blocking the client

## Setup

### 1. Install Dependencies

```bash
npm install @arbel/firebase-orm firebase-admin firebase-functions
```

### 2. Initialize Firebase ORM in Functions

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firebase ORM with admin SDK
FirestoreOrmRepository.initGlobalConnection(admin.firestore(), 'admin');

// Import your models
import './models/User';
import './models/Product';
import './models/Order';
```

### 3. Model Definitions

Use the same model definitions in your functions:

```typescript
// functions/src/models/Product.ts
import { BaseModel, Model, Field } from '@arbel/firebase-orm';

@Model({
  reference_path: 'products',
  path_id: 'product_id'
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public price!: number;

  @Field({ is_required: false })
  public description?: string;

  @Field({ is_required: true })
  public category!: string;

  @Field({ 
    is_text_indexing: true,  // Enable for search functionality
    is_required: false 
  })
  public searchKeywords?: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ field_name: 'updated_at' })
  public updatedAt?: string;
}
```

## Database Triggers

Use Firebase ORM in database triggers to respond to data changes:

### Product Processing Trigger

```typescript
// functions/src/triggers/productTriggers.ts
import * as functions from 'firebase-functions';
import { Product } from '../models/Product';

export const processProductChanges = functions.firestore
  .document('products/{productId}')
  .onWrite(async (change, context) => {
    const productId = context.params.productId;
    const after = change.after.data();
    const before = change.before.data();

    if (!after) {
      // Product was deleted
      console.log(`Product ${productId} was deleted`);
      await handleProductDeletion(productId, before);
      return;
    }

    if (!before) {
      // New product created
      console.log(`New product ${productId} created`);
      await handleNewProduct(productId, after);
      return;
    }

    // Product was updated
    console.log(`Product ${productId} updated`);
    await handleProductUpdate(productId, before, after);
  });

async function handleNewProduct(productId: string, data: any) {
  const product = new Product();
  await product.load(productId);

  // Generate search keywords
  const keywords = generateSearchKeywords(product.name, product.description, product.category);
  product.searchKeywords = keywords.join(' ');

  // Set timestamps
  product.createdAt = new Date().toISOString();
  product.updatedAt = new Date().toISOString();

  await product.save();

  // Trigger additional processing
  await updateInventory(product);
  await notifyAdmins('New product added', product);
}

async function handleProductUpdate(productId: string, before: any, after: any) {
  const product = new Product();
  await product.load(productId);

  // Update search keywords if content changed
  if (before.name !== after.name || before.description !== after.description) {
    const keywords = generateSearchKeywords(product.name, product.description, product.category);
    product.searchKeywords = keywords.join(' ');
  }

  // Update timestamp
  product.updatedAt = new Date().toISOString();

  await product.save();
}

function generateSearchKeywords(name: string, description?: string, category?: string): string[] {
  const keywords = new Set<string>();
  
  // Add name words
  name.toLowerCase().split(/\s+/).forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  // Add description words
  if (description) {
    description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
  }

  // Add category
  if (category) {
    keywords.add(category.toLowerCase());
  }

  return Array.from(keywords);
}
```

## HTTP Functions

Create REST APIs using Firebase ORM:

### Product API

```typescript
// functions/src/api/productApi.ts
import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { Product } from '../models/Product';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Get all products with pagination
app.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;

    let query = Product.query()
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (category) {
      query = query.where('category', '==', category);
    }

    // Implement pagination (simplified)
    if (page > 1) {
      const skip = (page - 1) * limit;
      // Note: Firestore doesn't have skip, use cursor-based pagination in production
    }

    const products = await query.get();
    
    res.json({
      products: products.map(p => p.toJson()),
      page,
      limit,
      total: await Product.count()
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const product = new Product();
    await product.load(req.params.id);
    
    res.json(product.toJson());
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Create new product
app.post('/products', async (req, res) => {
  try {
    const { name, price, description, category } = req.body;

    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, price, category' 
      });
    }

    const product = new Product();
    product.name = name;
    product.price = price;
    product.description = description;
    product.category = category;
    product.createdAt = new Date().toISOString();
    product.updatedAt = new Date().toISOString();

    await product.save();

    res.status(201).json(product.toJson());
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  try {
    const product = new Product();
    await product.load(req.params.id);

    const { name, price, description, category } = req.body;

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    
    product.updatedAt = new Date().toISOString();

    await product.save();

    res.json(product.toJson());
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete product
app.delete('/products/:id', async (req, res) => {
  try {
    const product = new Product();
    await product.load(req.params.id);
    await product.destroy();

    res.status(204).send();
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Search products
app.get('/products/search/:query', async (req, res) => {
  try {
    const searchQuery = req.params.query.toLowerCase();
    
    const products = await Product.query()
      .like('searchKeywords', `%${searchQuery}%`)
      .limit(20)
      .get();

    res.json({
      query: searchQuery,
      results: products.map(p => p.toJson())
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const productApi = functions.https.onRequest(app);
```

## Elasticsearch Integration

Integrate with Elasticsearch for advanced search capabilities:

```typescript
// functions/src/elasticsearch/sync.ts
import * as functions from 'firebase-functions';
import { Client } from '@elastic/elasticsearch';
import { Product } from '../models/Product';

const client = new Client({
  cloud: {
    id: functions.config().elasticsearch.cloud_id,
  },
  auth: {
    username: functions.config().elasticsearch.username,
    password: functions.config().elasticsearch.password,
  }
});

export const elasticsearchProductsSync = functions.firestore
  .document('products/{productId}')
  .onWrite(async (change, context) => {
    const productId = context.params.productId;
    const newData = change.after.data();
    const previousData = change.before.data();

    try {
      if (newData) {
        // Document created or updated
        const product = new Product();
        await product.load(productId);

        const esDocument = {
          id: productId,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          searchKeywords: product.searchKeywords,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };

        if (!previousData) {
          // Create new document
          console.log('Creating new product in Elasticsearch:', productId);
          await client.create({
            index: 'products',
            id: productId,
            body: esDocument
          });
        } else {
          // Update existing document
          console.log('Updating product in Elasticsearch:', productId);
          await client.update({
            index: 'products',
            id: productId,
            body: {
              doc: esDocument
            }
          });
        }
      } else {
        // Document deleted
        console.log('Deleting product from Elasticsearch:', productId);
        await client.delete({
          index: 'products',
          id: productId
        });
      }
    } catch (error) {
      console.error('Elasticsearch sync error:', error);
      
      // Log error but don't fail the function
      // You might want to add the failed sync to a retry queue
    }
  });

// Advanced search function
export const searchProducts = functions.https.onCall(async (data, context) => {
  try {
    const { query, category, minPrice, maxPrice, limit = 10 } = data;

    const searchBody: any = {
      query: {
        bool: {
          must: [],
          filter: []
        }
      },
      size: limit,
      sort: [{ _score: { order: 'desc' } }]
    };

    // Text search
    if (query) {
      searchBody.query.bool.must.push({
        multi_match: {
          query,
          fields: ['name^2', 'description', 'searchKeywords'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Category filter
    if (category) {
      searchBody.query.bool.filter.push({
        term: { category: category.toLowerCase() }
      });
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: any = { range: { price: {} } };
      if (minPrice !== undefined) priceFilter.range.price.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.range.price.lte = maxPrice;
      searchBody.query.bool.filter.push(priceFilter);
    }

    const response = await client.search({
      index: 'products',
      body: searchBody
    });

    return {
      hits: response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      })),
      total: response.body.hits.total.value
    };
  } catch (error) {
    console.error('Search error:', error);
    throw new functions.https.HttpsError('internal', 'Search failed');
  }
});
```

## Scheduled Functions

Use Firebase ORM in scheduled functions for background processing:

```typescript
// functions/src/scheduled/maintenance.ts
import * as functions from 'firebase-functions';
import { Product } from '../models/Product';

// Run daily cleanup at 2 AM
export const dailyCleanup = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('Running daily cleanup...');

    try {
      // Clean up old products marked for deletion
      const productsToDelete = await Product.query()
        .where('deletedAt', '!=', null)
        .where('deletedAt', '<', getDateDaysAgo(30))
        .get();

      console.log(`Found ${productsToDelete.length} products to permanently delete`);

      for (const product of productsToDelete) {
        await product.destroy();
        console.log(`Permanently deleted product: ${product.getId()}`);
      }

      // Update product statistics
      await updateProductStatistics();

      console.log('Daily cleanup completed successfully');
    } catch (error) {
      console.error('Daily cleanup failed:', error);
    }
  });

// Generate weekly reports
export const weeklyReports = functions.pubsub
  .schedule('0 9 * * MON')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('Generating weekly reports...');

    try {
      // Get product statistics
      const totalProducts = await Product.count();
      const newProductsThisWeek = await Product.query()
        .where('createdAt', '>=', getDateDaysAgo(7))
        .get();

      const categoryCounts = await getCategoryStatistics();

      const report = {
        period: 'weekly',
        generatedAt: new Date().toISOString(),
        totalProducts,
        newProductsThisWeek: newProductsThisWeek.length,
        categoryCounts,
      };

      // Save report (you could send email, save to database, etc.)
      console.log('Weekly report:', report);

      // Send to admin dashboard
      await saveReport(report);

    } catch (error) {
      console.error('Weekly report generation failed:', error);
    }
  });

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

async function getCategoryStatistics() {
  const categories = ['electronics', 'clothing', 'books', 'home'];
  const counts: Record<string, number> = {};

  for (const category of categories) {
    const products = await Product.query()
      .where('category', '==', category)
      .get();
    counts[category] = products.length;
  }

  return counts;
}

async function saveReport(report: any) {
  // Implementation depends on where you want to save reports
  // Could be Firestore, Cloud Storage, email, etc.
  console.log('Saving report:', report);
}

async function updateProductStatistics() {
  // Update cached statistics for dashboard
  const stats = {
    totalProducts: await Product.count(),
    lastUpdated: new Date().toISOString(),
  };

  // Save to a statistics document
  console.log('Updated statistics:', stats);
}
```

## Authentication Middleware

Add authentication middleware for secure API endpoints:

```typescript
// functions/src/middleware/auth.ts
import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticateUser = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has admin role (implement based on your user model)
  if (!req.user.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
```

## Best Practices

### 1. Error Handling
```typescript
export const safeFunction = functions.https.onCall(async (data, context) => {
  try {
    // Your Firebase ORM operations
    const result = await Product.getAll();
    return { success: true, data: result };
  } catch (error) {
    console.error('Function error:', error);
    
    // Return user-friendly errors
    if (error.message.includes('permission-denied')) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }
    
    throw new functions.https.HttpsError('internal', 'Internal server error');
  }
});
```

### 2. Performance Optimization
```typescript
// Batch operations for better performance
export const batchUpdateProducts = functions.https.onCall(async (data, context) => {
  const { productIds, updates } = data;
  
  // Load all products in parallel
  const products = await Promise.all(
    productIds.map(async (id: string) => {
      const product = new Product();
      await product.load(id);
      return product;
    })
  );

  // Update all products
  products.forEach(product => {
    Object.assign(product, updates);
    product.updatedAt = new Date().toISOString();
  });

  // Save all products in parallel
  await Promise.all(products.map(product => product.save()));

  return { updated: products.length };
});
```

### 3. Monitoring and Logging
```typescript
import * as functions from 'firebase-functions';

export const monitoredFunction = functions.https.onCall(async (data, context) => {
  const startTime = Date.now();
  
  try {
    console.log('Function started', { data, user: context.auth?.uid });
    
    // Your operation
    const result = await performOperation(data);
    
    const duration = Date.now() - startTime;
    console.log('Function completed', { duration, resultCount: result.length });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Function failed', { error: error.message, duration });
    throw error;
  }
});
```

## Deployment

Deploy your functions with Firebase ORM:

```bash
# Install dependencies
cd functions
npm install

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:productApi

# Deploy with environment variables
firebase functions:config:set elasticsearch.cloud_id="your-cloud-id"
firebase functions:config:set elasticsearch.username="your-username" 
firebase functions:config:set elasticsearch.password="your-password"
```

Firebase Functions with Firebase ORM provides a powerful combination for building scalable, maintainable server-side applications with consistent patterns across your entire stack.