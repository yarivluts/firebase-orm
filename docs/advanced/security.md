# Security & Rules

This guide covers security best practices, Firestore security rules, and authentication patterns when using Firebase ORM.

## Firestore Security Rules

### Basic Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read, authenticated write
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Role-based access
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Hierarchical Data Security

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Website members can only access their website's data
    match /websites/{websiteId}/members/{memberId} {
      allow read, write: if request.auth != null && 
        // Check if user is a member of this website
        exists(/databases/$(database)/documents/websites/$(websiteId)/members/$(request.auth.uid));
    }
    
    // Nested collections with inheritance
    match /websites/{websiteId}/{document=**} {
      allow read, write: if request.auth != null && 
        // Check website ownership or membership
        (get(/databases/$(database)/documents/websites/$(websiteId)).data.ownerId == request.auth.uid ||
         exists(/databases/$(database)/documents/websites/$(websiteId)/members/$(request.auth.uid)));
    }
  }
}
```

### Field-Level Security

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null && 
        request.auth.uid == userId &&
        // Prevent users from changing sensitive fields
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'isVerified', 'credits']);
      
      allow create: if request.auth != null && 
        request.auth.uid == userId &&
        // Ensure required fields are set on creation
        request.resource.data.keys().hasAll(['name', 'email']) &&
        // Set default role
        request.resource.data.role == 'user';
    }
  }
}
```

## Authentication Integration

### User Model with Authentication

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ is_required: false })
  public role: string = 'user';

  @Field({ is_required: false, field_name: "is_verified" })
  public isVerified: boolean = false;

  @Field({ field_name: "created_at" })
  public createdAt?: string;

  @Field({ field_name: "last_login" })
  public lastLogin?: string;

  // Security methods
  hasRole(role: string): boolean {
    return this.role === role;
  }

  hasPermission(permission: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['read', 'write', 'delete', 'manage_users'],
      'moderator': ['read', 'write', 'moderate'],
      'user': ['read', 'write_own']
    };

    return rolePermissions[this.role]?.includes(permission) || false;
  }

  async updateLastLogin(): Promise<void> {
    this.lastLogin = new Date().toISOString();
    await this.save();
  }
}
```

### Authentication Service

```typescript
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

export class AuthService {
  private auth = getAuth();

  async signUp(email: string, password: string, userData: any): Promise<User> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Create user model
      const user = new User();
      user.setId(userCredential.user.uid);
      user.email = email;
      user.name = userData.name;
      user.createdAt = new Date().toISOString();
      
      await user.save();
      return user;
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Load user model
      const user = await User.init(userCredential.user.uid);
      if (!user) {
        throw new Error('User profile not found');
      }
      
      // Update last login
      await user.updateLastLogin();
      
      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const user = await User.init(firebaseUser.uid);
      return user;
    } catch (error) {
      console.error('Failed to load current user:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
```

### Role-Based Access Control

```typescript
// Permission decorator
function RequirePermission(permission: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      if (!currentUser.hasPermission(permission)) {
        throw new Error(`Permission denied: ${permission} required`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Usage in services
export class AdminService {
  @RequirePermission('manage_users')
  async deleteUser(userId: string): Promise<void> {
    const user = await User.init(userId);
    if (!user) {
      throw new Error('User not found');
    }
    await user.destroy();
  }

  @RequirePermission('read')
  async getUsers(): Promise<User[]> {
    return await User.getAll();
  }
}
```

## Data Validation and Sanitization

### Model-Level Validation

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "posts",
  path_id: "post_id"
})
export class Post extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ field_name: "author_id" })
  public authorId!: string;

  @Field({ is_required: false })
  public status: 'draft' | 'published' | 'archived' = 'draft';

  @Field({ field_name: "created_at" })
  public createdAt?: string;

  // Validation hooks
  async beforeSave(): Promise<void> {
    await this.validate();
    await this.sanitize();
    
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
  }

  private async validate(): Promise<void> {
    const errors: string[] = [];

    // Title validation
    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (this.title && this.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    // Content validation
    if (!this.content || this.content.trim().length === 0) {
      errors.push('Content is required');
    }
    if (this.content && this.content.length > 10000) {
      errors.push('Content must be less than 10,000 characters');
    }

    // Author validation
    if (this.authorId) {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.getId() !== this.authorId) {
        errors.push('Invalid author');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private sanitize(): void {
    // Sanitize HTML content
    this.title = this.sanitizeHtml(this.title);
    this.content = this.sanitizeHtml(this.content);
  }

  private sanitizeHtml(html: string): string {
    // Basic HTML sanitization - use a proper library like DOMPurify in production
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
  }
}
```

### Input Validation Service

```typescript
export class ValidationService {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove < and > characters
      .substring(0, 1000); // Limit length
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Security Middleware

### Request Validation Middleware

```typescript
export class SecurityMiddleware {
  static async validateRequest(req: any, res: any, next: any) {
    try {
      // Check authentication
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify token
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;

      // Rate limiting
      await SecurityMiddleware.checkRateLimit(req.user.uid);

      // Input validation
      SecurityMiddleware.validateRequestData(req.body);

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication' });
    }
  }

  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  private static async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // Max 100 requests per minute

    const userLimit = this.rateLimitStore.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
      return;
    }

    if (userLimit.count >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    userLimit.count++;
  }

  private static validateRequestData(data: any): void {
    if (!data) return;

    // Check for common injection patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:text\/html/i
    ];

    const checkValue = (value: any): void => {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('Invalid input detected');
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(checkValue);
      }
    };

    checkValue(data);
  }
}
```

### CORS and Security Headers

```typescript
export class SecurityHeaders {
  static setSecurityHeaders(req: any, res: any, next: any) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com;"
    );

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // HSTS (HTTPS only)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Prevent referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  }
}
```

## Secure Model Patterns

### Audit Trail

```typescript
@Model({
  reference_path: "audit_logs",
  path_id: "audit_id"
})
export class AuditLog extends BaseModel {
  @Field({ is_required: true, field_name: "user_id" })
  public userId!: string;

  @Field({ is_required: true })
  public action!: string;

  @Field({ is_required: true, field_name: "resource_type" })
  public resourceType!: string;

  @Field({ is_required: true, field_name: "resource_id" })
  public resourceId!: string;

  @Field({ is_required: false })
  public changes?: any;

  @Field({ field_name: "ip_address" })
  public ipAddress?: string;

  @Field({ field_name: "user_agent" })
  public userAgent?: string;

  @Field({ field_name: "created_at" })
  public createdAt!: string;

  static async log(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: any,
    metadata?: any
  ): Promise<void> {
    const log = new AuditLog();
    log.userId = userId;
    log.action = action;
    log.resourceType = resourceType;
    log.resourceId = resourceId;
    log.changes = changes;
    log.ipAddress = metadata?.ipAddress;
    log.userAgent = metadata?.userAgent;
    log.createdAt = new Date().toISOString();

    await log.save();
  }
}

// Add audit logging to model operations
export class SecureBaseModel extends BaseModel {
  async save(): Promise<this> {
    const isNew = !this.getId();
    const currentUser = await getCurrentUser();
    
    if (currentUser) {
      await AuditLog.log(
        currentUser.getId(),
        isNew ? 'create' : 'update',
        this.constructor.name,
        this.getId() || 'new',
        this.toJSON()
      );
    }

    return super.save();
  }

  async destroy(): Promise<void> {
    const currentUser = await getCurrentUser();
    
    if (currentUser) {
      await AuditLog.log(
        currentUser.getId(),
        'delete',
        this.constructor.name,
        this.getId(),
        this.toJSON()
      );
    }

    return super.destroy();
  }
}
```

### Soft Delete Pattern

```typescript
@Model({
  reference_path: "posts",
  path_id: "post_id"
})
export class Post extends SecureBaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: true })
  public content!: string;

  @Field({ field_name: "deleted_at" })
  public deletedAt?: string;

  @Field({ field_name: "deleted_by" })
  public deletedBy?: string;

  // Override destroy to implement soft delete
  async destroy(): Promise<void> {
    const currentUser = await getCurrentUser();
    
    this.deletedAt = new Date().toISOString();
    this.deletedBy = currentUser?.getId();
    
    await this.save();
  }

  // Method to permanently delete
  async forceDestroy(): Promise<void> {
    await super.destroy();
  }

  // Query only non-deleted records
  static async getActive(): Promise<Post[]> {
    return await Post.query()
      .where('deletedAt', '==', null)
      .get();
  }

  // Restore soft-deleted record
  async restore(): Promise<void> {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    await this.save();
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }
}
```

## Data Encryption

### Field-Level Encryption

```typescript
import * as crypto from 'crypto';

export class EncryptionService {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;

  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const keyBuffer = crypto.scryptSync(key, 'salt', this.keyLength);
    const cipher = crypto.createCipher(this.algorithm, keyBuffer);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedData: string, key: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const keyBuffer = crypto.scryptSync(key, 'salt', this.keyLength);
    
    const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Encrypted field decorator
function EncryptedField(options: any = {}) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;
    
    Object.defineProperty(target, propertyKey, {
      get() {
        const encryptedValue = this[privateKey];
        if (!encryptedValue) return undefined;
        
        const encryptionKey = this.getEncryptionKey();
        return EncryptionService.decrypt(encryptedValue, encryptionKey);
      },
      
      set(value: string) {
        if (value) {
          const encryptionKey = this.getEncryptionKey();
          this[privateKey] = EncryptionService.encrypt(value, encryptionKey);
        } else {
          this[privateKey] = value;
        }
      }
    });

    // Register the private field for serialization
    Field(options)(target, privateKey);
  };
}

// Usage
@Model({
  reference_path: "sensitive_data",
  path_id: "data_id"
})
export class SensitiveData extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @EncryptedField({ field_name: "encrypted_ssn" })
  public ssn!: string;

  @EncryptedField({ field_name: "encrypted_credit_card" })
  public creditCard!: string;

  private getEncryptionKey(): string {
    // In production, use proper key management
    return process.env.ENCRYPTION_KEY || 'default-key';
  }
}
```

## Security Best Practices

### 1. Authentication & Authorization
- Always verify user authentication before operations
- Implement role-based access control
- Use principle of least privilege
- Validate user permissions on both client and server

### 2. Data Validation
- Validate all input data
- Sanitize user input to prevent XSS
- Use parameterized queries to prevent injection
- Implement proper field validation

### 3. Firestore Security Rules
- Write restrictive security rules
- Test security rules thoroughly
- Use field-level validation in rules
- Implement proper hierarchical security

### 4. Network Security
- Use HTTPS only
- Implement proper CORS policies
- Set security headers
- Use rate limiting

### 5. Data Protection
- Encrypt sensitive data
- Implement audit logging
- Use soft delete for important data
- Regular security audits

### 6. Error Handling
- Don't expose sensitive information in errors
- Log security events
- Implement proper error boundaries
- Use generic error messages for users

### 7. Development Practices
- Regular dependency updates
- Security code reviews
- Automated security testing
- Follow OWASP guidelines