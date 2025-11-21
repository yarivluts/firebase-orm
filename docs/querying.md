# Querying Data

Firebase ORM provides a powerful and intuitive query API that allows you to filter, sort, and paginate your data efficiently.

## Basic Queries

### Simple Queries

```typescript
// Get all records
const allUsers = await User.getAll();

// Find one record by field
const user = await User.findOne('email', '==', 'john@example.com');

// Find one record by ID
const user = await User.init('user-123');
```

### Query Builder

Firebase ORM provides a chainable query builder for complex queries:

```typescript
// Single condition
const activeUsers = await User.query()
  .where('isActive', '==', true)
  .get();

// Multiple conditions (AND)
const list = await Member.query()
  .where('age', '>', '3')
  .where('weight', '>', '30')
  .get();

// OR conditions
const list = await Member.query()
  .where('age', '>', '3')
  .orWhere('age', '<', '1')
  .limit(10)
  .get();
```

## Query Methods

### Where Clauses

```typescript
// Equality
await User.query().where('status', '==', 'active').get();

// Comparison operators
await User.query().where('age', '>', 18).get();
await User.query().where('score', '>=', 100).get();
await User.query().where('level', '<', 10).get();
await User.query().where('points', '<=', 500).get();

// Array contains
await User.query().where('tags', 'array-contains', 'premium').get();

// In array
await User.query().where('status', 'in', ['active', 'pending']).get();

// Not in array
await User.query().where('status', 'not-in', ['banned', 'deleted']).get();
```

### OR Queries

```typescript
// OR conditions
const users = await User.query()
  .where('role', '==', 'admin')
  .orWhere('role', '==', 'moderator')
  .get();

// Complex OR with multiple fields
const users = await User.query()
  .where('age', '>', 21)
  .orWhere('status', '==', 'verified')
  .get();
```

### Ordering

```typescript
// Order by single field
const users = await User.query()
  .orderBy('createdAt', 'desc')
  .get();

// Order by multiple fields
const users = await User.query()
  .orderBy('status', 'asc')
  .orderBy('createdAt', 'desc')
  .get();
```

### Pagination

```typescript
// Limit results
const users = await User.query()
  .limit(10)
  .get();

// Offset (skip)
const users = await User.query()
  .offset(20)
  .limit(10)
  .get();

// Cursor-based pagination
const firstPage = await User.query()
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Get next page using last document
const lastDoc = firstPage[firstPage.length - 1];
const secondPage = await User.query()
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc.createdAt)
  .limit(10)
  .get();
```

## Text Search

Firebase ORM supports text indexing for LIKE operations:

### Setting Up Text Indexing

```typescript
@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  @Field({
    is_required: true,
    is_text_indexing: true  // Enable text indexing
  })
  public name!: string;

  @Field({
    is_required: true,
    is_text_indexing: true
  })
  public description!: string;
}
```

### Using LIKE Queries

```typescript
// Search for products containing "phone"
const products = await Product.query()
  .like('name', '%phone%')
  .get();

// Case-insensitive search
const products = await Product.query()
  .like('name', '%iPhone%')
  .get();

// Combined with other conditions
const products = await Product.query()
  .where('price', '<', 1000)
  .like('name', '%smartphone%')
  .get();

// Multiple LIKE conditions
const products = await Product.query()
  .like('name', '%phone%')
  .like('description', '%5G%')
  .get();
```

## Advanced Querying

### Complex Queries

```typescript
// Complex query with multiple conditions
const advancedQuery = await User.query()
  .where('age', '>=', 18)
  .where('status', '==', 'active')
  .where('tags', 'array-contains', 'premium')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// Query with OR and AND combinations
const complexQuery = await User.query()
  .where('role', '==', 'admin')
  .orWhere(subQuery => 
    subQuery
      .where('role', '==', 'user')
      .where('verified', '==', true)
  )
  .get();
```

### Hierarchical Queries

```typescript
// Query nested collections
const website = await Website.findOne('domain', '==', 'example.com');
const members = await website.getModel(Member).query()
  .where('role', '==', 'admin')
  .orderBy('joinedAt', 'desc')
  .get();
```

### Geographic Queries

```typescript
// Note: Firestore has limited geo-query support
// You may need additional libraries for complex geo queries

@Model({
  reference_path: "locations",
  path_id: "location_id"
})
export class Location extends BaseModel {
  @Field({ is_required: true })
  public latitude!: number;

  @Field({ is_required: true })
  public longitude!: number;

  @Field({ is_required: true })
  public name!: string;
}

// Basic range queries for coordinates
const nearbyLocations = await Location.query()
  .where('latitude', '>=', 40.7128 - 0.1)
  .where('latitude', '<=', 40.7128 + 0.1)
  .where('longitude', '>=', -74.0060 - 0.1)
  .where('longitude', '<=', -74.0060 + 0.1)
  .get();
```

## Query Performance

### Indexing

Firestore requires indexes for complex queries. Firebase ORM will suggest indexes when needed:

```typescript
// This query requires a composite index
const users = await User.query()
  .where('status', '==', 'active')
  .where('age', '>', 21)
  .orderBy('createdAt', 'desc')
  .get();
```

### Best Practices

```typescript
// ✅ Good: Use specific queries
const activeUsers = await User.query()
  .where('status', '==', 'active')
  .limit(100)
  .get();

// ❌ Avoid: Loading all data then filtering
const allUsers = await User.getAll();
const activeUsers = allUsers.filter(u => u.status === 'active');

// ✅ Good: Order by indexed fields
const users = await User.query()
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// ✅ Good: Use pagination for large datasets
const getUsers = async (pageSize = 20, lastDoc?: User) => {
  let query = User.query()
    .orderBy('createdAt', 'desc')
    .limit(pageSize);
    
  if (lastDoc) {
    query = query.startAfter(lastDoc.createdAt);
  }
  
  return await query.get();
};
```

## Error Handling

```typescript
try {
  const users = await User.query()
    .where('status', '==', 'active')
    .where('age', '>', 21)
    .get();
} catch (error) {
  if (error.message.includes('index')) {
    console.log('Missing Firestore index - check Firebase console');
  } else if (error.message.includes('permission')) {
    console.log('Insufficient permissions for this query');
  } else {
    console.error('Query failed:', error);
  }
}
```

## Query Debugging

### Logging Queries

```typescript
// Enable query logging (development only)
User.query()
  .where('status', '==', 'active')
  .debug() // Logs the query details
  .get();
```

### Query Analysis

```typescript
// Get query execution plan
const queryPlan = User.query()
  .where('status', '==', 'active')
  .where('age', '>', 21)
  .explain();

console.log('Query execution plan:', queryPlan);
```

## Working with Query Results

### Processing Results

```typescript
// Process query results
const users = await User.query()
  .where('status', '==', 'active')
  .get();

// Iterate through results
users.forEach(user => {
  console.log(`User: ${user.name} (${user.email})`);
});

// Transform results
const userNames = users.map(user => user.name);
const userCount = users.length;

// Filter results further (in memory)
const premiumUsers = users.filter(user => 
  user.subscription === 'premium'
);
```

### Aggregations

```typescript
// Count queries (Firestore v9+)
const activeUserCount = await User.query()
  .where('status', '==', 'active')
  .count();

// Manual aggregations
const users = await User.query()
  .where('status', '==', 'active')
  .get();

const totalAge = users.reduce((sum, user) => sum + (user.age || 0), 0);
const averageAge = totalAge / users.length;
```

## Caching Strategies

### Query Result Caching

```typescript
// Simple in-memory cache
const queryCache = new Map();

const getCachedUsers = async (status: string) => {
  const cacheKey = `users_status_${status}`;
  
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey);
  }
  
  const users = await User.query()
    .where('status', '==', status)
    .get();
    
  queryCache.set(cacheKey, users);
  
  // Clear cache after 5 minutes
  setTimeout(() => {
    queryCache.delete(cacheKey);
  }, 5 * 60 * 1000);
  
  return users;
};
```

## Common Query Patterns

### Search Functionality

```typescript
// Full-text search simulation
const searchUsers = async (searchTerm: string) => {
  const lowercaseSearch = searchTerm.toLowerCase();
  
  // Search by multiple fields
  const nameResults = await User.query()
    .like('name', `%${lowercaseSearch}%`)
    .get();
    
  const emailResults = await User.query()
    .like('email', `%${lowercaseSearch}%`)
    .get();
    
  // Combine and deduplicate results
  const allResults = [...nameResults, ...emailResults];
  const uniqueResults = allResults.filter((user, index, array) => 
    array.findIndex(u => u.getId() === user.getId()) === index
  );
  
  return uniqueResults;
};
```

### Date Range Queries

```typescript
// Get records from date range
const getRecentPosts = async (days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await Post.query()
    .where('createdAt', '>=', startDate.toISOString())
    .orderBy('createdAt', 'desc')
    .get();
};

// Get records from specific month
const getMonthlyPosts = async (year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await Post.query()
    .where('createdAt', '>=', startDate.toISOString())
    .where('createdAt', '<=', endDate.toISOString())
    .orderBy('createdAt', 'desc')
    .get();
};
```

### Relationship Queries

```typescript
// Query related data
const getUserWithPosts = async (userId: string) => {
  const user = await User.init(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const posts = await Post.query()
    .where('authorId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
    
  return { user, posts };
};

// Find users by related data
const getUsersWithManyPosts = async (minPosts: number = 5) => {
  // Note: This requires multiple queries as Firestore doesn't support joins
  const allPosts = await Post.getAll();
  
  const postCounts = allPosts.reduce((counts, post) => {
    counts[post.authorId] = (counts[post.authorId] || 0) + 1;
    return counts;
  }, {} as { [userId: string]: number });
  
  const activeUserIds = Object.keys(postCounts)
    .filter(userId => postCounts[userId] >= minPosts);
    
  // Load users in batches (Firestore 'in' has limit of 10)
  const users: User[] = [];
  for (let i = 0; i < activeUserIds.length; i += 10) {
    const batch = activeUserIds.slice(i, i + 10);
    const batchUsers = await User.query()
      .where('id', 'in', batch)
      .get();
    users.push(...batchUsers);
  }
  
  return users;
};
```