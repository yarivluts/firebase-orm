# Node.js Integration

This guide shows how to integrate Firebase ORM with Node.js backend applications, covering Express.js APIs, serverless functions, and microservices architectures.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase-admin moment --save
```

For development:
```bash
npm install --save-dev @types/node nodemon ts-node typescript
```

### 2. TypeScript Configuration

Create or update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Project Structure

```
src/
├── config/
│   ├── firebase.ts
│   └── database.ts
├── models/
│   ├── User.ts
│   ├── Post.ts
│   └── index.ts
├── controllers/
│   ├── userController.ts
│   └── postController.ts
├── routes/
│   ├── userRoutes.ts
│   └── postRoutes.ts
├── middleware/
│   ├── auth.ts
│   ├── validation.ts
│   └── errorHandler.ts
├── services/
│   ├── userService.ts
│   └── emailService.ts
├── utils/
│   ├── logger.ts
│   └── helpers.ts
├── app.ts
└── server.ts
```

## Firebase Admin Setup

### Configuration

```typescript
// src/config/firebase.ts
import admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Method 1: Using service account file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } 
  // Method 2: Using service account object
  else if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  // Method 3: Using default credentials (Google Cloud)
  else {
    admin.initializeApp();
  }
}

const firestore = admin.firestore();

// Initialize Firebase ORM
FirestoreOrmRepository.initGlobalConnection(firestore);

export { admin, firestore };
```

### Environment Variables

```bash
# .env
NODE_ENV=development
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Alternative: Path to service account file
# GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Security
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key

# External Services
SENDGRID_API_KEY=your-sendgrid-key
```

## Models

### User Model

```typescript
// src/models/User.ts
import { BaseModel, Model, Field, HasMany, BelongsToMany } from '@arbel/firebase-orm';
import { Post } from './Post';
import { Role } from './Role';

@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: 'password_hash' })
  public passwordHash?: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ field_name: 'updated_at' })
  public updatedAt?: string;

  @Field({ is_required: false })
  public bio?: string;

  @Field({ is_required: false })
  public avatar?: string;

  @Field({ is_required: false, default_value: true })
  public isActive?: boolean;

  @Field({ is_required: false, field_name: 'last_login' })
  public lastLogin?: string;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  @BelongsToMany({ 
    model: Role, 
    junctionModel: 'UserRole',
    localKey: 'user_id',
    foreignKey: 'role_id'
  })
  public roles?: Role[];

  // Helper methods
  toJSON() {
    return {
      id: this.getId(),
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      bio: this.bio,
      avatar: this.avatar,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
    };
  }

  toPublicJSON() {
    return {
      id: this.getId(),
      name: this.name,
      bio: this.bio,
      avatar: this.avatar,
      createdAt: this.createdAt,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const users = await User.query().where('email', '==', email).get();
    return users.length > 0 ? users[0] : null;
  }

  static async findActive(): Promise<User[]> {
    return await User.query().where('isActive', '==', true).get();
  }

  async updateLastLogin(): Promise<void> {
    this.lastLogin = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    await this.save();
  }

  async softDelete(): Promise<void> {
    this.isActive = false;
    this.updatedAt = new Date().toISOString();
    await this.save();
  }

  async hasRole(roleName: string): Promise<boolean> {
    if (!this.roles) {
      await this.loadBelongsToMany('roles');
    }
    return this.roles?.some(role => role.name === roleName) ?? false;
  }
}
```

### Post Model

```typescript
// src/models/Post.ts
import { BaseModel, Model, Field, BelongsTo } from '@arbel/firebase-orm';
import { User } from './User';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ is_required: false })
  public excerpt?: string;

  @Field({ field_name: 'author_id' })
  public authorId!: string;

  @Field({ is_required: false, default_value: PostStatus.DRAFT })
  public status?: PostStatus;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ field_name: 'updated_at' })
  public updatedAt?: string;

  @Field({ field_name: 'published_at' })
  public publishedAt?: string;

  @Field({ is_required: false })
  public tags?: string[];

  @Field({ is_required: false, field_name: 'view_count', default_value: 0 })
  public viewCount?: number;

  @BelongsTo({ model: User, localKey: 'authorId' })
  public author?: User;

  // Helper methods
  toJSON() {
    return {
      id: this.getId(),
      title: this.title,
      content: this.content,
      excerpt: this.excerpt,
      authorId: this.authorId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt,
      tags: this.tags || [],
      viewCount: this.viewCount || 0,
    };
  }

  toPublicJSON() {
    return {
      id: this.getId(),
      title: this.title,
      excerpt: this.excerpt || this.content.substring(0, 150) + '...',
      authorId: this.authorId,
      publishedAt: this.publishedAt,
      tags: this.tags || [],
      viewCount: this.viewCount || 0,
    };
  }

  static async findPublished(): Promise<Post[]> {
    return await Post.query()
      .where('status', '==', PostStatus.PUBLISHED)
      .orderBy('publishedAt', 'desc')
      .get();
  }

  static async findByAuthor(authorId: string): Promise<Post[]> {
    return await Post.query()
      .where('authorId', '==', authorId)
      .orderBy('createdAt', 'desc')
      .get();
  }

  static async findByTag(tag: string): Promise<Post[]> {
    return await Post.query()
      .where('tags', 'array-contains', tag)
      .where('status', '==', PostStatus.PUBLISHED)
      .get();
  }

  async publish(): Promise<void> {
    this.status = PostStatus.PUBLISHED;
    this.publishedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    await this.save();
  }

  async incrementViewCount(): Promise<void> {
    this.viewCount = (this.viewCount || 0) + 1;
    await this.save();
  }

  generateExcerpt(length: number = 150): string {
    if (this.excerpt) return this.excerpt;
    return this.content.length > length 
      ? this.content.substring(0, length) + '...'
      : this.content;
  }
}
```

## Services

### User Service

```typescript
// src/services/userService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { emailService } from './emailService';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: string;
}

export interface UpdateUserData {
  name?: string;
  bio?: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class UserService {
  static async createUser(userData: CreateUserData): Promise<User> {
    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = new User();
    user.name = userData.name;
    user.email = userData.email;
    user.passwordHash = passwordHash;
    user.bio = userData.bio;
    user.avatar = userData.avatar;
    user.isActive = true;
    user.createdAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    await user.save();

    // Send welcome email
    await emailService.sendWelcomeEmail(user);

    return user;
  }

  static async authenticate(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const user = await User.findByEmail(credentials.email);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new Error('User has no password set');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.getId(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return { user, token };
  }

  static async getUserById(id: string): Promise<User | null> {
    try {
      const user = await User.init(id);
      return (user && user.isActive) ? user : null;
    } catch (error) {
      return null;
    }
  }

  static async updateUser(id: string, updates: UpdateUserData): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.initFromData(updates);
    user.updatedAt = new Date().toISOString();
    await user.save();

    return user;
  }

  static async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    await user.softDelete();
  }

  static async getAllUsers(options: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  } = {}): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 10, includeInactive = false } = options;
    const offset = (page - 1) * limit;

    let query = User.query();
    
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    // Get total count
    const totalUsers = await User.count();
    
    // Get paginated results
    const users = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .startAfter(offset)
      .get();

    const totalPages = Math.ceil(totalUsers / limit);

    return {
      users,
      total: totalUsers,
      page,
      totalPages,
    };
  }

  static async searchUsers(searchTerm: string): Promise<User[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or Elasticsearch for better search
    const users = await User.findActive();
    
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.updatedAt = new Date().toISOString();
    await user.save();
  }
}
```

### Post Service

```typescript
// src/services/postService.ts
import { Post, PostStatus } from '../models/Post';
import { UserService } from './userService';

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  authorId: string;
  tags?: string[];
  status?: PostStatus;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  status?: PostStatus;
}

export class PostService {
  static async createPost(postData: CreatePostData): Promise<Post> {
    // Verify author exists
    const author = await UserService.getUserById(postData.authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    const post = new Post();
    post.title = postData.title;
    post.content = postData.content;
    post.excerpt = postData.excerpt;
    post.authorId = postData.authorId;
    post.tags = postData.tags || [];
    post.status = postData.status || PostStatus.DRAFT;
    post.viewCount = 0;
    post.createdAt = new Date().toISOString();
    post.updatedAt = new Date().toISOString();

    if (post.status === PostStatus.PUBLISHED) {
      post.publishedAt = new Date().toISOString();
    }

    await post.save();
    return post;
  }

  static async getPostById(id: string): Promise<Post | null> {
    try {
      const post = await Post.init(id);
      return post;
    } catch (error) {
      return null;
    }
  }

  static async updatePost(id: string, updates: UpdatePostData): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    const wasPublished = post.status === PostStatus.PUBLISHED;
    
    post.initFromData(updates);
    post.updatedAt = new Date().toISOString();

    // Set published date if status changed to published
    if (!wasPublished && post.status === PostStatus.PUBLISHED) {
      post.publishedAt = new Date().toISOString();
    }

    await post.save();
    return post;
  }

  static async deletePost(id: string): Promise<void> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.destroy();
  }

  static async getPublishedPosts(options: {
    page?: number;
    limit?: number;
    authorId?: string;
    tag?: string;
  } = {}): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 10, authorId, tag } = options;
    const offset = (page - 1) * limit;

    let query = Post.query().where('status', '==', PostStatus.PUBLISHED);

    if (authorId) {
      query = query.where('authorId', '==', authorId);
    }

    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }

    // Get total count (approximate for pagination)
    const totalPosts = await Post.count();
    
    // Get paginated results
    const posts = await query
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .startAfter(offset)
      .get();

    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts,
      total: totalPosts,
      page,
      totalPages,
    };
  }

  static async getPostsByAuthor(authorId: string): Promise<Post[]> {
    return await Post.findByAuthor(authorId);
  }

  static async getPostsByTag(tag: string): Promise<Post[]> {
    return await Post.findByTag(tag);
  }

  static async publishPost(id: string): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.publish();
    return post;
  }

  static async incrementPostViews(id: string): Promise<Post> {
    const post = await this.getPostById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.incrementViewCount();
    return post;
  }

  static async searchPosts(searchTerm: string): Promise<Post[]> {
    // Simple search implementation
    const posts = await Post.findPublished();
    
    return posts.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.tags && post.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }
}
```

## Controllers

### User Controller

```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { validationResult } from 'express-validator';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const user = await UserService.createUser(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { user, token } = await UserService.authenticate(req.body);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeInactive = req.query.includeInactive === 'true';

      const result = await UserService.getAllUsers({ page, limit, includeInactive });
      
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: result.users.map(user => user.toPublicJSON()),
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      
      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user.toPublicJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      
      // Check if user is updating their own profile or has admin rights
      if (req.user?.userId !== id && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Can only update your own profile',
        });
      }

      const user = await UserService.updateUser(id, req.body);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: user.toJSON(),
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Check if user is deleting their own account or has admin rights
      if (req.user?.userId !== id && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Can only delete your own account',
        });
      }

      await UserService.deleteUser(id);
      
      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      next(error);
    }
  }

  static async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const users = await UserService.searchUsers(q);
      
      res.json({
        success: true,
        message: 'Search completed successfully',
        data: users.map(user => user.toPublicJSON()),
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      
      // Check if user is changing their own password
      if (req.user?.userId !== id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Can only change your own password',
        });
      }

      await UserService.changePassword(id, oldPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
      next(error);
    }
  }
}
```

## Routes

### User Routes

```typescript
// src/routes/userRoutes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/auth';

const router = Router();

// Validation rules
const createUserValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const userIdValidation = [
  param('id').isLength({ min: 1 }).withMessage('User ID is required'),
];

// Public routes
router.post('/register', createUserValidation, UserController.createUser);
router.post('/login', loginValidation, UserController.login);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below

router.get('/search', UserController.searchUsers);
router.get('/', UserController.getUsers);
router.get('/:id', userIdValidation, UserController.getUserById);
router.put('/:id', [...userIdValidation, ...updateUserValidation], UserController.updateUser);
router.delete('/:id', userIdValidation, UserController.deleteUser);
router.post('/:id/change-password', [...userIdValidation, ...changePasswordValidation], UserController.changePassword);

export { router as userRoutes };
```

## Middleware

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        isAdmin?: boolean;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    // Verify user still exists and is active
    const user = await UserService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.',
      });
    }

    // Check if user has admin role (assuming roles are loaded)
    const isAdmin = await user.hasRole('admin');

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      isAdmin,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.',
    });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin rights required.',
    });
  }
  next();
};

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
      };

      const user = await UserService.getUserById(decoded.userId);
      if (user) {
        const isAdmin = await user.hasRole('admin');
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          isAdmin,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};
```

### Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Log error
  logger.error('Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Firestore errors
  if (error.message.includes('permission-denied')) {
    statusCode = 403;
    message = 'Permission denied';
  } else if (error.message.includes('not-found')) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (error.message.includes('already-exists')) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
```

## Express App Setup

### Main App

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { userRoutes } from './routes/userRoutes';
import { postRoutes } from './routes/postRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Initialize Firebase
import './config/firebase';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

### Server

```typescript
// src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});
```

## Utilities

### Logger

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'firebase-orm-api' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export { logger };
```

## Testing

### Jest Setup

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
```

```typescript
// src/test/setup.ts
import { jest } from '@jest/globals';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  apps: [],
}));

// Mock Firebase ORM
jest.mock('@arbel/firebase-orm', () => ({
  FirestoreOrmRepository: {
    initGlobalConnection: jest.fn(),
  },
  BaseModel: class MockBaseModel {
    save = jest.fn();
    load = jest.fn();
    destroy = jest.fn();
    getId = jest.fn(() => 'mock-id');
    static getAll = jest.fn(() => Promise.resolve([]));
    static query = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve([])),
    }));
    static count = jest.fn(() => Promise.resolve(0));
  },
  Model: () => (target: any) => target,
  Field: () => (target: any, propertyKey: string) => {},
  HasMany: () => (target: any, propertyKey: string) => {},
  BelongsTo: () => (target: any, propertyKey: string) => {},
}));
```

### Service Tests

```typescript
// src/services/__tests__/userService.test.ts
import { UserService } from '../userService';
import { User } from '../../models/User';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      // Mock User.findByEmail to return null (user doesn't exist)
      jest.spyOn(User, 'findByEmail').mockResolvedValue(null);

      // Mock user save
      const mockUser = new User();
      jest.spyOn(mockUser, 'save').mockResolvedValue();

      const result = await UserService.createUser(userData);

      expect(result).toBeInstanceOf(User);
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      // Mock User.findByEmail to return existing user
      const existingUser = new User();
      jest.spyOn(User, 'findByEmail').mockResolvedValue(existingUser);

      await expect(UserService.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with valid credentials', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = new User();
      mockUser.email = credentials.email;
      mockUser.passwordHash = 'hashedpassword';
      mockUser.isActive = true;

      jest.spyOn(User, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(mockUser, 'updateLastLogin').mockResolvedValue();

      // Mock bcrypt compare
      jest.doMock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true),
      }));

      const result = await UserService.authenticate(credentials);

      expect(result.user).toBe(mockUser);
      expect(result.token).toBeDefined();
    });
  });
});
```

## Docker Setup

### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - api
    restart: unless-stopped
```

## Deployment

### Package.json Scripts

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "docker:build": "docker build -t firebase-orm-api .",
    "docker:run": "docker run -p 3000:3000 firebase-orm-api"
  }
}
```

### CI/CD Example (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          # Add your deployment commands here
          echo "Deploying to production..."
```

## Best Practices

### 1. Environment Management

```typescript
// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'JWT_SECRET',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### 2. Database Transactions

```typescript
// Example of transaction usage with Firebase ORM
import { admin } from '../config/firebase';

export class TransactionService {
  static async transferData(fromId: string, toId: string, amount: number) {
    const db = admin.firestore();
    
    return await db.runTransaction(async (transaction) => {
      // Read operations must come before write operations
      const fromUser = await User.init(fromId);
      const toUser = await User.init(toId);
      
      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }
      
      if (fromUser.balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Update balances
      fromUser.balance -= amount;
      toUser.balance += amount;
      
      // Save within transaction
      await fromUser.save();
      await toUser.save();
      
      return { fromUser, toUser };
    });
  }
}
```

### 3. Caching Strategy

```typescript
// Simple in-memory cache example
class CacheService {
  private cache = new Map<string, { data: any; expires: number }>();
  
  set(key: string, data: any, ttlSeconds: number = 300) {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
}

export const cache = new CacheService();
```

## Common Issues

### 1. Firebase Admin Initialization

Ensure Firebase Admin is initialized before using Firebase ORM.

### 2. Environment Variables

Use proper environment variable validation and defaults.

### 3. Error Handling

Implement comprehensive error handling for all async operations.

### 4. Memory Leaks

Be careful with real-time subscriptions and event listeners.

## Next Steps

- Learn about [Real-time Features](../realtime.md)
- Explore [Performance Optimization](../advanced/performance.md)
- Check [Security Best Practices](../advanced/security.md)