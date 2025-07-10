# Elasticsearch Integration

Firebase ORM provides built-in support for Elasticsearch integration, enabling powerful full-text search capabilities beyond Firestore's native querying limitations.

## Overview

Elasticsearch integration allows you to:
- Perform complex full-text searches
- Use SQL-like queries with binding parameters
- Implement advanced search features like fuzzy matching, autocomplete, and faceted search
- Scale search operations independently from your Firestore database

## Setup

### Prerequisites

1. **Elasticsearch Instance**: You need access to an Elasticsearch cluster (cloud or self-hosted)
2. **Firebase Functions**: Set up a Firebase Function to sync data between Firestore and Elasticsearch
3. **Security**: Configure proper security rules and API keys

### Initialize Elasticsearch Connection

```typescript
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

// Set global Elasticsearch connection
FirestoreOrmRepository.initGlobalElasticsearchConnection(
  "https://your-elasticsearch-endpoint.com"
);
```

### Data Synchronization Setup

Create a Firebase Function to sync data between Firestore and Elasticsearch:

```typescript
import * as functions from "firebase-functions";
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  cloud: {
    id: "your-cloud-id",
    username: "your-username",
    password: "your-password"
  }
});

export const elasticsearchProductsSync = functions.firestore
  .document("products/{productId}")
  .onWrite((snap, context) => {
    const productId = context.params.productId;
    const newData = snap.after.data();
    const previousData = snap.before.data();

    if (newData) {
      newData.id = productId;

      if (!previousData) {
        // Create new document
        console.log("Creating new product:", productId);
        return client
          .create({
            index: "products",
            type: "_doc",
            id: productId,
            body: newData
          })
          .catch(handleElasticsearchError);
      } else {
        // Update existing document
        console.log("Updating product:", productId);
        return client.transport
          .request({
            method: "POST",
            path: "/products/_doc/" + productId,
            body: newData
          })
          .catch(handleElasticsearchError);
      }
    } else {
      // Delete document
      console.log("Deleting product:", productId);
      return client
        .delete({
          index: "products",
          type: "_doc",
          id: productId
        })
        .catch(handleElasticsearchError);
    }
  });

function handleElasticsearchError(error: any) {
  const errorDetails = error.meta && error.meta.body && error.meta.body.error 
    ? error.meta.body 
    : error;
  console.error("Elasticsearch error:", errorDetails);
}
```

## Basic Usage

### Model Configuration

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false })
  public description?: string;

  @Field({ is_required: true })
  public price!: number;

  @Field({ is_required: false })
  public category?: string;

  @Field({ is_required: false })
  public tags?: string[];

  @Field({ is_required: false })
  public qty?: number;

  @Field({ field_name: "created_at" })
  public createdAt?: string;
}
```

### Simple Elasticsearch Queries

```typescript
// Basic SQL query
const result = await Product.elasticSql("WHERE qty > 0", 3);

// Get total count
const totalCount = await result.count();
console.log(`Found ${totalCount} products in stock`);

// Iterate through results
let current = 0;
while (result.next) {
  current++;
  const products = await result.next();
  console.log(`Page ${current}:`, products);
}
```

### Parameterized Queries

```typescript
// Using binding parameters
const result = await Product.elasticSql([
  "WHERE name LIKE :searchTerm AND price > :minPrice AND category IN (:categories)",
  {
    searchTerm: "%smartphone%",
    minPrice: 100,
    categories: ["electronics", "mobile"]
  }
]);

const totalCount = await result.count();
console.log(`Found ${totalCount} matching products`);

// Process results
while (result.next) {
  const products = await result.next();
  products.forEach(product => {
    console.log(`${product.name} - $${product.price}`);
  });
}
```

## Advanced Elasticsearch Queries

### Full-Text Search

```typescript
// Full-text search across multiple fields
const searchProducts = async (searchTerm: string) => {
  const result = await Product.elasticSql([
    `WHERE MATCH(name, description) AGAINST (:searchTerm) OR tags LIKE :tagSearch`,
    {
      searchTerm: searchTerm,
      tagSearch: `%${searchTerm}%`
    }
  ]);
  
  return await result.getAllResults();
};
```

### Range Queries

```typescript
// Price range search
const result = await Product.elasticSql([
  "WHERE price BETWEEN :minPrice AND :maxPrice AND qty > 0",
  {
    minPrice: 50,
    maxPrice: 500
  }
]);
```

### Date Range Queries

```typescript
// Products created in the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const result = await Product.elasticSql([
  "WHERE created_at >= :fromDate",
  {
    fromDate: thirtyDaysAgo.toISOString()
  }
]);
```

### Aggregations

```typescript
// Group by category with counts
const result = await Product.elasticSql([
  "SELECT category, COUNT(*) as count FROM products WHERE qty > 0 GROUP BY category",
  {}
]);
```

### Sorting and Pagination

```typescript
// Sort by price descending with pagination
const result = await Product.elasticSql([
  "WHERE qty > 0 ORDER BY price DESC LIMIT :limit OFFSET :offset",
  {
    limit: 20,
    offset: 40
  }
]);
```

## Complex Search Features

### Fuzzy Matching

```typescript
// Search with typo tolerance
const fuzzySearch = async (searchTerm: string) => {
  const result = await Product.elasticSql([
    "WHERE FUZZY(name, :searchTerm, 2)",  // Allow 2 character differences
    {
      searchTerm: searchTerm
    }
  ]);
  
  return await result.getAllResults();
};
```

### Autocomplete

```typescript
// Autocomplete suggestions
const getAutocompleteSuggestions = async (prefix: string) => {
  const result = await Product.elasticSql([
    "WHERE name LIKE :prefix ORDER BY popularity DESC LIMIT 10",
    {
      prefix: `${prefix}%`
    }
  ]);
  
  const products = await result.getAllResults();
  return products.map(p => p.name);
};
```

### Faceted Search

```typescript
// Get facets for search refinement
const getFacetedResults = async (searchTerm: string) => {
  // Get main results
  const mainResult = await Product.elasticSql([
    "WHERE MATCH(name, description) AGAINST (:searchTerm)",
    { searchTerm }
  ]);
  
  // Get category facets
  const categoryFacets = await Product.elasticSql([
    "SELECT category, COUNT(*) as count FROM products WHERE MATCH(name, description) AGAINST (:searchTerm) GROUP BY category",
    { searchTerm }
  ]);
  
  // Get price range facets
  const priceFacets = await Product.elasticSql([
    "SELECT CASE WHEN price < 50 THEN 'Under $50' WHEN price < 100 THEN '$50-$100' ELSE 'Over $100' END as range, COUNT(*) as count FROM products WHERE MATCH(name, description) AGAINST (:searchTerm) GROUP BY range",
    { searchTerm }
  ]);
  
  return {
    products: await mainResult.getAllResults(),
    facets: {
      categories: await categoryFacets.getAllResults(),
      priceRanges: await priceFacets.getAllResults()
    }
  };
};
```

## Search Result Processing

### Pagination Helper

```typescript
class SearchResultPaginator {
  private result: any;
  private pageSize: number;
  private currentPage: number = 0;

  constructor(result: any, pageSize: number = 20) {
    this.result = result;
    this.pageSize = pageSize;
  }

  async getTotalCount(): Promise<number> {
    return await this.result.count();
  }

  async getPage(pageNumber: number): Promise<any[]> {
    this.currentPage = pageNumber;
    // Reset to beginning if needed
    if (pageNumber === 0) {
      // Reset result
    }
    
    return await this.result.next();
  }

  async getAllPages(): Promise<any[]> {
    const allResults = [];
    while (this.result.next) {
      const page = await this.result.next();
      allResults.push(...page);
    }
    return allResults;
  }
}

// Usage
const result = await Product.elasticSql("WHERE qty > 0");
const paginator = new SearchResultPaginator(result, 10);

const totalCount = await paginator.getTotalCount();
const firstPage = await paginator.getPage(0);
const secondPage = await paginator.getPage(1);
```

### Search Result Highlighting

```typescript
// Highlight search terms in results
const highlightSearchResults = async (searchTerm: string) => {
  const result = await Product.elasticSql([
    "WHERE MATCH(name, description) AGAINST (:searchTerm)",
    { searchTerm }
  ]);
  
  const products = await result.getAllResults();
  
  return products.map(product => ({
    ...product,
    highlightedName: highlightText(product.name, searchTerm),
    highlightedDescription: highlightText(product.description, searchTerm)
  }));
};

function highlightText(text: string, searchTerm: string): string {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

## Performance Optimization

### Index Management

```typescript
// Create optimized indexes for your models
const createProductIndex = async () => {
  const indexSettings = {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          product_analyzer: {
            tokenizer: "standard",
            filter: ["lowercase", "stop", "snowball"]
          }
        }
      }
    },
    mappings: {
      properties: {
        name: {
          type: "text",
          analyzer: "product_analyzer",
          fields: {
            keyword: { type: "keyword" }
          }
        },
        description: {
          type: "text",
          analyzer: "product_analyzer"
        },
        price: { type: "float" },
        category: { type: "keyword" },
        tags: { type: "keyword" },
        qty: { type: "integer" },
        created_at: { type: "date" }
      }
    }
  };
  
  // Create index (this would be done via Elasticsearch API)
  console.log("Index settings:", JSON.stringify(indexSettings, null, 2));
};
```

### Query Optimization

```typescript
// Use specific fields instead of wildcards
const efficientSearch = async (searchTerm: string) => {
  // ✅ Good: Search specific fields
  const result = await Product.elasticSql([
    "SELECT name, price, category FROM products WHERE MATCH(name) AGAINST (:searchTerm)",
    { searchTerm }
  ]);
  
  return await result.getAllResults();
};

// Cache frequent queries
const searchCache = new Map<string, any>();

const cachedSearch = async (searchTerm: string) => {
  const cacheKey = `search_${searchTerm}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  const result = await Product.elasticSql([
    "WHERE MATCH(name, description) AGAINST (:searchTerm)",
    { searchTerm }
  ]);
  
  const products = await result.getAllResults();
  searchCache.set(cacheKey, products);
  
  // Cache for 5 minutes
  setTimeout(() => {
    searchCache.delete(cacheKey);
  }, 5 * 60 * 1000);
  
  return products;
};
```

## Error Handling

### Connection Errors

```typescript
const searchWithErrorHandling = async (searchTerm: string) => {
  try {
    const result = await Product.elasticSql([
      "WHERE MATCH(name) AGAINST (:searchTerm)",
      { searchTerm }
    ]);
    
    return await result.getAllResults();
  } catch (error) {
    if (error.message.includes('connection')) {
      console.error('Elasticsearch connection failed');
      // Fallback to Firestore search
      return await Product.query()
        .like('name', `%${searchTerm}%`)
        .get();
    } else if (error.message.includes('index_not_found')) {
      console.error('Elasticsearch index not found');
      return [];
    } else {
      console.error('Elasticsearch search failed:', error);
      throw error;
    }
  }
};
```

### Query Validation

```typescript
const validateSearchQuery = (searchTerm: string): string => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('Search term cannot be empty');
  }
  
  if (searchTerm.length < 2) {
    throw new Error('Search term must be at least 2 characters');
  }
  
  // Escape special SQL characters
  return searchTerm.replace(/['"\\]/g, '\\$&');
};

const safeSearch = async (searchTerm: string) => {
  const validatedTerm = validateSearchQuery(searchTerm);
  
  const result = await Product.elasticSql([
    "WHERE MATCH(name, description) AGAINST (:searchTerm)",
    { searchTerm: validatedTerm }
  ]);
  
  return await result.getAllResults();
};
```

## Integration Examples

### Search API Endpoint

```typescript
import express from 'express';
import { Product } from './models/Product';

const app = express();

app.get('/api/search', async (req, res) => {
  try {
    const { 
      q: searchTerm, 
      category, 
      minPrice, 
      maxPrice, 
      page = 0, 
      limit = 20 
    } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    let query = "WHERE MATCH(name, description) AGAINST (:searchTerm)";
    const params: any = { searchTerm };
    
    if (category) {
      query += " AND category = :category";
      params.category = category;
    }
    
    if (minPrice) {
      query += " AND price >= :minPrice";
      params.minPrice = Number(minPrice);
    }
    
    if (maxPrice) {
      query += " AND price <= :maxPrice";
      params.maxPrice = Number(maxPrice);
    }
    
    query += " ORDER BY _score DESC LIMIT :limit OFFSET :offset";
    params.limit = Number(limit);
    params.offset = Number(page) * Number(limit);
    
    const result = await Product.elasticSql([query, params]);
    const products = await result.getAllResults();
    const totalCount = await result.count();
    
    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### React Search Component

```typescript
import React, { useState, useEffect } from 'react';
import { Product } from './models/Product';

interface SearchResult {
  products: Product[];
  total: number;
}

const ProductSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult>({ products: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const performSearch = async (term: string, page: number = 0) => {
    if (!term.trim()) {
      setResults({ products: [], total: 0 });
      return;
    }

    setLoading(true);
    try {
      const result = await Product.elasticSql([
        "WHERE MATCH(name, description) AGAINST (:searchTerm) ORDER BY _score DESC LIMIT 20 OFFSET :offset",
        {
          searchTerm: term,
          offset: page * 20
        }
      ]);

      const products = await result.getAllResults();
      const total = await result.count();

      setResults({ products, total });
      setCurrentPage(page);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ products: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />

      {loading && <div>Searching...</div>}

      <div className="results">
        {results.products.map(product => (
          <div key={product.getId()} className="product-item">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <span>${product.price}</span>
          </div>
        ))}
      </div>

      {results.total > 20 && (
        <div className="pagination">
          {Array.from({ length: Math.ceil(results.total / 20) }, (_, i) => (
            <button
              key={i}
              onClick={() => performSearch(searchTerm, i)}
              className={currentPage === i ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Best Practices

### 1. Index Design

```typescript
// Design indexes based on your query patterns
const productIndexMapping = {
  properties: {
    // Analyzed field for full-text search
    name: {
      type: "text",
      analyzer: "standard",
      fields: {
        // Keyword field for exact matches and sorting
        keyword: { type: "keyword" },
        // Completion field for autocomplete
        suggest: { type: "completion" }
      }
    },
    // Numeric fields for range queries
    price: { type: "scaled_float", scaling_factor: 100 },
    // Keyword fields for filtering
    category: { type: "keyword" },
    // Date fields for time-based queries
    created_at: { type: "date" }
  }
};
```

### 2. Data Synchronization

```typescript
// Ensure data consistency between Firestore and Elasticsearch
const syncronizeData = async () => {
  const products = await Product.getAll();
  
  for (const product of products) {
    try {
      // Sync each product to Elasticsearch
      await syncProductToElasticsearch(product);
    } catch (error) {
      console.error(`Failed to sync product ${product.getId()}:`, error);
    }
  }
};

const syncProductToElasticsearch = async (product: Product) => {
  const elasticsearchDoc = {
    id: product.getId(),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    tags: product.tags,
    qty: product.qty,
    created_at: product.createdAt
  };
  
  // Use your Elasticsearch client to index the document
  // This would be implemented based on your specific setup
};
```

### 3. Query Performance

```typescript
// Use appropriate query types for different use cases
const searchStrategies = {
  // Exact match
  exactMatch: (term: string) => `WHERE name.keyword = :term`,
  
  // Full-text search
  fullText: (term: string) => `WHERE MATCH(name, description) AGAINST (:term)`,
  
  // Prefix matching (for autocomplete)
  prefix: (term: string) => `WHERE name LIKE :term`,
  
  // Fuzzy matching
  fuzzy: (term: string) => `WHERE FUZZY(name, :term, 2)`,
  
  // Boolean search
  boolean: (terms: string[]) => `WHERE name CONTAINS ALL (:terms)`
};
```

### 4. Monitoring and Analytics

```typescript
// Track search analytics
const trackSearchMetrics = async (searchTerm: string, resultCount: number) => {
  const searchLog = {
    query: searchTerm,
    results: resultCount,
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId()
  };
  
  // Log to analytics service
  console.log('Search metrics:', searchLog);
};

// Monitor query performance
const monitorQuery = async (queryFn: () => Promise<any>) => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    console.log(`Query completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Query failed after ${duration}ms:`, error);
    throw error;
  }
};
```