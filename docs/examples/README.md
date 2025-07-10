# Complete Examples

This directory contains complete application examples demonstrating how to use Firebase ORM in real-world scenarios.

## Available Examples

### 1. Blog Application
A complete blog system with users, posts, comments, and tags.

**Features:**
- User authentication and profiles
- Blog post creation and management
- Commenting system with nested replies
- Tag-based categorization
- Search functionality
- Real-time updates

**Models:**
- User
- UserProfile
- Post
- Comment
- Tag
- PostTag (junction table)

**File:** `blog-example.ts`

### 2. E-commerce Store
An online store with products, orders, and inventory management.

**Features:**
- Product catalog with categories
- Shopping cart functionality
- Order processing
- Inventory tracking
- User reviews and ratings
- Payment integration

**Models:**
- Product
- Category
- Order
- OrderItem
- Review
- Inventory

**File:** `ecommerce-example.ts`

### 3. Task Management System
A project management tool with teams, projects, and tasks.

**Features:**
- Team collaboration
- Project organization
- Task assignment and tracking
- File attachments
- Progress reporting
- Notifications

**Models:**
- Team
- Project
- Task
- User
- TeamMember
- TaskAssignment

**File:** `task-management-example.ts`

### 4. Social Media Platform
A social networking application with posts, friendships, and messaging.

**Features:**
- User profiles and authentication
- Friend connections
- Post sharing and interactions
- Private messaging
- News feed
- Image uploads

**Models:**
- User
- Post
- Like
- Comment
- Friendship
- Message

**File:** `social-media-example.ts`

### 5. Learning Management System
An educational platform with courses, lessons, and student progress tracking.

**Features:**
- Course creation and management
- Lesson structure
- Student enrollment
- Progress tracking
- Quizzes and assessments
- Certificates

**Models:**
- Course
- Lesson
- Student
- Enrollment
- Progress
- Quiz

**File:** `lms-example.ts`

## Quick Start

### 1. Choose an Example
Select the example that best matches your use case or interests.

### 2. Setup Firebase
```bash
# Install dependencies
npm install @arbel/firebase-orm firebase moment

# Set up Firebase project
firebase init
```

### 3. Configure Firebase
```typescript
// firebase-config.ts
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Initialize Firebase ORM
```typescript
// app.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';
import { firebaseConfig } from './firebase-config';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
FirestoreOrmRepository.initGlobalConnection(firestore);
```

### 5. Run the Example
```typescript
// Import and run your chosen example
import { BlogExample } from './examples/blog-example';

const example = new BlogExample();
await example.run();
```

## Framework Integration Examples

### React Integration
See how to integrate Firebase ORM with React applications:
- Component patterns
- Hook usage
- State management
- Real-time updates

**Files:**
- `react-blog-app/`
- `react-ecommerce/`

### Next.js Integration
Server-side rendering and static generation examples:
- SSR with Firebase ORM
- API routes
- Static generation
- Incremental static regeneration

**Files:**
- `nextjs-blog/`
- `nextjs-ecommerce/`

### Node.js Backend
Backend API examples:
- Express.js integration
- Authentication middleware
- RESTful APIs
- GraphQL resolvers

**Files:**
- `nodejs-api/`
- `express-backend/`

### Vue.js Integration
Vue.js application examples:
- Composition API
- Vuex integration
- Real-time components

**Files:**
- `vue-task-manager/`
- `nuxt-blog/`

## Testing Examples

### Unit Testing
Examples of unit testing Firebase ORM models and services:
```typescript
// tests/user.test.ts
import { User } from '../models/User';
import { TestDataFactory } from '../utils/TestDataFactory';

describe('User Model', () => {
  test('should create user with valid data', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    const user = TestDataFactory.createUser(userData);
    await user.save();
    
    expect(user.getId()).toBeDefined();
    expect(user.name).toBe('John Doe');
  });
});
```

### Integration Testing
Examples of testing Firebase ORM with actual Firebase services:
```typescript
// tests/integration/blog.test.ts
import { BlogService } from '../services/BlogService';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-setup';

describe('Blog Service Integration', () => {
  beforeEach(async () => {
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestEnvironment();
  });

  test('should create and retrieve blog post', async () => {
    const blogService = new BlogService();
    const post = await blogService.createPost({
      title: 'Test Post',
      content: 'Test content'
    });

    const retrievedPost = await blogService.getPost(post.getId());
    expect(retrievedPost.title).toBe('Test Post');
  });
});
```

## Performance Examples

### Optimization Techniques
Examples demonstrating performance optimization:
- Query optimization
- Caching strategies
- Batch operations
- Memory management

**Files:**
- `performance/query-optimization.ts`
- `performance/caching-examples.ts`
- `performance/batch-operations.ts`

### Monitoring
Examples of performance monitoring and analytics:
```typescript
// monitoring/performance-monitor.ts
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

// Monitor query performance
const monitor = new PerformanceMonitor();
monitor.startMonitoring();

// Track specific operations
const users = await monitor.trackOperation(
  'User.getAll',
  () => User.getAll()
);
```

## Security Examples

### Authentication Patterns
Examples of user authentication and authorization:
- Login/signup flows
- Role-based access control
- JWT token handling
- Session management

**Files:**
- `security/auth-examples.ts`
- `security/rbac-examples.ts`

### Data Validation
Examples of input validation and sanitization:
```typescript
// security/validation-examples.ts
import { ValidationService } from '../services/ValidationService';

const userInput = {
  name: '<script>alert("xss")</script>John',
  email: 'user@example.com'
};

// Sanitize input
const sanitizedData = ValidationService.sanitizeUserInput(userInput);
```

## Advanced Examples

### Real-time Features
Examples of implementing real-time functionality:
- Live chat systems
- Collaborative editing
- Real-time notifications
- Live data synchronization

**Files:**
- `realtime/chat-example.ts`
- `realtime/collaborative-editor.ts`

### File Upload and Storage
Examples of file handling:
- Image uploads
- Document management
- File processing
- CDN integration

**Files:**
- `storage/file-upload-examples.ts`
- `storage/image-processing.ts`

### Search and Analytics
Examples of search implementation:
- Full-text search
- Elasticsearch integration
- Analytics tracking
- Search suggestions

**Files:**
- `search/elasticsearch-example.ts`
- `search/full-text-search.ts`

## Deployment Examples

### Production Deployment
Examples of deploying Firebase ORM applications:
- Environment configuration
- CI/CD pipelines
- Performance monitoring
- Error tracking

**Files:**
- `deployment/production-config.ts`
- `deployment/ci-cd-examples.yml`

### Scaling Examples
Examples of scaling Firebase ORM applications:
- Load balancing
- Database sharding
- Caching layers
- Performance optimization

**Files:**
- `scaling/load-balancing.ts`
- `scaling/caching-strategies.ts`

## Contributing Examples

If you have a useful example that demonstrates Firebase ORM capabilities, please contribute!

### Guidelines for Contributing Examples
1. **Complete and Working**: Examples should be complete, working applications
2. **Well Documented**: Include clear documentation and comments
3. **Best Practices**: Follow Firebase ORM best practices
4. **Real-world Scenarios**: Focus on practical, real-world use cases
5. **Testing**: Include tests where appropriate

### Example Structure
```
examples/
├── your-example/
│   ├── README.md           # Example-specific documentation
│   ├── models/             # Model definitions
│   ├── services/           # Business logic
│   ├── tests/              # Test files
│   ├── package.json        # Dependencies
│   └── src/
│       ├── index.ts        # Main application file
│       └── config/         # Configuration files
```

## Support

If you need help with any of these examples:
1. Check the individual example documentation
2. Review the main Firebase ORM documentation
3. Open an issue on GitHub with specific questions
4. Join the community discussions

## License

All examples are provided under the same license as Firebase ORM. Feel free to use them as starting points for your own applications.

---

These examples are designed to help you understand Firebase ORM capabilities and get started quickly with your own projects. Each example includes detailed comments and documentation to guide you through the implementation.