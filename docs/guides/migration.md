# Migration Guide

This guide helps you migrate from older versions of Firebase ORM and from other ORMs to Firebase ORM.

## Migrating from Firebase ORM v1.x to v2.x

### Breaking Changes

#### 1. Import Changes
```typescript
// ❌ Old way (v1.x)
import { FirebaseORM } from 'firebase-orm';

// ✅ New way (v2.x)
import { FirestoreOrmRepository, BaseModel, Model, Field } from '@arbel/firebase-orm';
```

#### 2. Model Definition Changes
```typescript
// ❌ Old way (v1.x)
export class User extends FirebaseORM {
  constructor() {
    super();
    this.collection = 'users';
  }
  
  name: string;
  email: string;
}

// ✅ New way (v2.x)
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
}
```

#### 3. Connection Initialization
```typescript
// ❌ Old way (v1.x)
FirebaseORM.init(firebaseConfig);

// ✅ New way (v2.x)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
FirestoreOrmRepository.initGlobalConnection(firestore);
```

### Migration Steps

#### Step 1: Update Dependencies
```bash
# Uninstall old version
npm uninstall firebase-orm

# Install new version
npm install @arbel/firebase-orm firebase moment
```

#### Step 2: Update TypeScript Configuration
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

#### Step 3: Convert Models
```typescript
// Create a migration script
import { legacyUserData } from './legacy-data';
import { User } from './models/User';

const migrateUsers = async () => {
  for (const userData of legacyUserData) {
    const user = new User();
    user.name = userData.name;
    user.email = userData.email;
    // Convert any legacy field names
    user.createdAt = userData.created_at || new Date().toISOString();
    
    await user.save();
  }
};
```

#### Step 4: Update Queries
```typescript
// ❌ Old way (v1.x)
const users = await User.where('status', '==', 'active').get();

// ✅ New way (v2.x)
const users = await User.query()
  .where('status', '==', 'active')
  .get();
```

#### Step 5: Update Relationships
```typescript
// ❌ Old way (v1.x)
const posts = await user.hasMany(Post);

// ✅ New way (v2.x)
const posts = await user.loadHasMany('posts');
```

## Migrating from Other ORMs

### From Sequelize

#### Model Definition Comparison
```typescript
// Sequelize
const User = sequelize.define('User', {
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  email: DataTypes.STRING
});

// Firebase ORM
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;

  @Field({ is_required: true })
  public lastName!: string;

  @Field({ is_required: true })
  public email!: string;
}
```

#### Query Comparison
```typescript
// Sequelize
const users = await User.findAll({
  where: {
    status: 'active'
  },
  order: [['createdAt', 'DESC']],
  limit: 10
});

// Firebase ORM
const users = await User.query()
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

### From TypeORM

#### Model Definition Comparison
```typescript
// TypeORM
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;
}

// Firebase ORM
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public firstName!: string;

  @Field({ is_required: true })
  public lastName!: string;

  @Field({ is_required: true })
  public email!: string;
}
```

#### Relationship Comparison
```typescript
// TypeORM
@Entity()
export class User {
  @OneToMany(() => Post, post => post.user)
  posts: Post[];
}

@Entity()
export class Post {
  @ManyToOne(() => User, user => user.posts)
  user: User;
}

// Firebase ORM
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @HasMany({ model: Post, foreignKey: 'user_id' })
  public posts?: Post[];
}

@Model({
  reference_path: "posts",
  path_id: "post_id"
})
export class Post extends BaseModel {
  @Field({ field_name: "user_id" })
  public userId!: string;

  @BelongsTo({ model: User, localKey: 'userId' })
  public user?: User;
}
```

### From Mongoose

#### Model Definition Comparison
```typescript
// Mongoose
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Firebase ORM
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
  public age?: number;

  @Field({ field_name: "created_at" })
  public createdAt?: string;

  async beforeSave() {
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
  }
}
```

## Data Migration Strategies

### Large Dataset Migration

```typescript
export class DataMigrationService {
  // Batch migration for large datasets
  static async migrateLargeCollection<T extends BaseModel>(
    sourceCollection: string,
    ModelClass: new () => T,
    transformer: (data: any) => Partial<T>,
    batchSize: number = 100
  ): Promise<void> {
    const firestore = getFirestore();
    let lastDoc: any = null;
    let processed = 0;

    while (true) {
      let query = firestore
        .collection(sourceCollection)
        .orderBy('__name__')
        .limit(batchSize);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }

      const batch = firestore.batch();
      const models: T[] = [];

      for (const doc of snapshot.docs) {
        const sourceData = doc.data();
        const transformedData = transformer(sourceData);
        
        const model = new ModelClass();
        Object.assign(model, transformedData);
        models.push(model);
      }

      // Save models in batches
      await Promise.all(models.map(model => model.save()));
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      processed += snapshot.docs.length;
      
      console.log(`Migrated ${processed} documents`);
    }
  }

  // Field mapping migration
  static async migrateWithFieldMapping<T extends BaseModel>(
    sourceCollection: string,
    ModelClass: new () => T,
    fieldMapping: Record<string, string>
  ): Promise<void> {
    await this.migrateLargeCollection(
      sourceCollection,
      ModelClass,
      (data: any) => {
        const transformed: any = {};
        
        for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
          if (data[sourceField] !== undefined) {
            transformed[targetField] = data[sourceField];
          }
        }
        
        return transformed;
      }
    );
  }
}

// Usage
await DataMigrationService.migrateWithFieldMapping(
  'legacy_users',
  User,
  {
    'full_name': 'name',
    'email_address': 'email',
    'creation_date': 'createdAt',
    'last_login_date': 'lastLogin'
  }
);
```

### Schema Migration

```typescript
export class SchemaMigrationService {
  // Add new fields with default values
  static async addField<T extends BaseModel>(
    ModelClass: new () => T,
    fieldName: string,
    defaultValue: any
  ): Promise<void> {
    const models = await (ModelClass as any).getAll();
    
    for (const model of models) {
      if ((model as any)[fieldName] === undefined) {
        (model as any)[fieldName] = defaultValue;
        await model.save();
      }
    }
  }

  // Rename fields
  static async renameField<T extends BaseModel>(
    ModelClass: new () => T,
    oldFieldName: string,
    newFieldName: string
  ): Promise<void> {
    const models = await (ModelClass as any).getAll();
    
    for (const model of models) {
      if ((model as any)[oldFieldName] !== undefined) {
        (model as any)[newFieldName] = (model as any)[oldFieldName];
        delete (model as any)[oldFieldName];
        await model.save();
      }
    }
  }

  // Transform field values
  static async transformField<T extends BaseModel>(
    ModelClass: new () => T,
    fieldName: string,
    transformer: (value: any) => any
  ): Promise<void> {
    const models = await (ModelClass as any).getAll();
    
    for (const model of models) {
      if ((model as any)[fieldName] !== undefined) {
        (model as any)[fieldName] = transformer((model as any)[fieldName]);
        await model.save();
      }
    }
  }
}

// Usage examples
// Add default role to all users
await SchemaMigrationService.addField(User, 'role', 'user');

// Rename field
await SchemaMigrationService.renameField(User, 'fullName', 'name');

// Transform timestamps from seconds to ISO strings
await SchemaMigrationService.transformField(
  User,
  'createdAt',
  (value: number) => new Date(value * 1000).toISOString()
);
```

## Environment Migration

### Development to Production

```typescript
// Environment-specific configurations
export class MigrationConfig {
  static getDatabaseConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    const configs = {
      development: {
        projectId: 'your-dev-project',
        databaseURL: 'https://your-dev-project.firebaseio.com',
        batchSize: 10
      },
      staging: {
        projectId: 'your-staging-project',
        databaseURL: 'https://your-staging-project.firebaseio.com',
        batchSize: 50
      },
      production: {
        projectId: 'your-prod-project',
        databaseURL: 'https://your-prod-project.firebaseio.com',
        batchSize: 100
      }
    };

    return configs[env as keyof typeof configs];
  }

  static async syncEnvironments(
    sourceEnv: string,
    targetEnv: string,
    collections: string[]
  ): Promise<void> {
    // Implementation for syncing data between environments
    console.log(`Syncing from ${sourceEnv} to ${targetEnv}`);
    
    for (const collection of collections) {
      await this.syncCollection(collection, sourceEnv, targetEnv);
    }
  }

  private static async syncCollection(
    collection: string,
    sourceEnv: string,
    targetEnv: string
  ): Promise<void> {
    // Implementation for syncing a specific collection
    console.log(`Syncing collection: ${collection}`);
  }
}
```

### Rollback Strategies

```typescript
export class RollbackService {
  // Create backup before migration
  static async createBackup<T extends BaseModel>(
    ModelClass: new () => T,
    backupName: string
  ): Promise<void> {
    const models = await (ModelClass as any).getAll();
    const backupData = models.map(model => model.toJSON());
    
    // Store backup (this could be in a separate collection, file, etc.)
    const backup = {
      timestamp: new Date().toISOString(),
      modelName: ModelClass.name,
      data: backupData
    };
    
    // Save backup to a backup collection
    const backupDoc = {
      name: backupName,
      backup: backup
    };
    
    // Store in Firestore backup collection
    const firestore = getFirestore();
    await firestore.collection('backups').doc(backupName).set(backupDoc);
  }

  // Restore from backup
  static async restoreFromBackup<T extends BaseModel>(
    ModelClass: new () => T,
    backupName: string
  ): Promise<void> {
    const firestore = getFirestore();
    const backupDoc = await firestore.collection('backups').doc(backupName).get();
    
    if (!backupDoc.exists) {
      throw new Error(`Backup ${backupName} not found`);
    }
    
    const backupData = backupDoc.data()!.backup;
    
    // Clear existing data
    const existingModels = await (ModelClass as any).getAll();
    await Promise.all(existingModels.map(model => model.destroy()));
    
    // Restore from backup
    for (const itemData of backupData.data) {
      const model = new ModelClass();
      Object.assign(model, itemData);
      await model.save();
    }
  }
}

// Usage
// Create backup before migration
await RollbackService.createBackup(User, 'users_before_migration_v2');

// Perform migration
await performMigration();

// If something goes wrong, rollback
await RollbackService.restoreFromBackup(User, 'users_before_migration_v2');
```

## Testing Migration

```typescript
export class MigrationTestService {
  // Test migration with a subset of data
  static async testMigration<T extends BaseModel>(
    ModelClass: new () => T,
    migrationFunction: (model: T) => Promise<void>,
    testSampleSize: number = 10
  ): Promise<{ success: boolean; errors: string[] }> {
    const models = await (ModelClass as any).getAll();
    const testModels = models.slice(0, testSampleSize);
    const errors: string[] = [];

    for (const model of testModels) {
      try {
        await migrationFunction(model);
      } catch (error) {
        errors.push(`Migration failed for ${model.getId()}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  // Validate migration results
  static async validateMigration<T extends BaseModel>(
    ModelClass: new () => T,
    validator: (model: T) => boolean
  ): Promise<{ valid: boolean; invalidModels: string[] }> {
    const models = await (ModelClass as any).getAll();
    const invalidModels: string[] = [];

    for (const model of models) {
      if (!validator(model)) {
        invalidModels.push(model.getId());
      }
    }

    return {
      valid: invalidModels.length === 0,
      invalidModels
    };
  }
}

// Usage
const testResult = await MigrationTestService.testMigration(
  User,
  async (user) => {
    user.role = user.role || 'user';
    await user.save();
  },
  5
);

if (testResult.success) {
  console.log('Migration test passed');
} else {
  console.error('Migration test failed:', testResult.errors);
}
```

## Best Practices for Migration

### 1. Planning
- **Backup Data**: Always create backups before migration
- **Test Thoroughly**: Test migrations on development/staging first
- **Document Changes**: Keep detailed migration logs
- **Plan Rollback**: Have a rollback strategy ready

### 2. Execution
- **Batch Processing**: Process large datasets in batches
- **Monitor Progress**: Log migration progress
- **Handle Errors**: Implement proper error handling
- **Validate Results**: Verify migration success

### 3. Post-Migration
- **Performance Testing**: Test application performance
- **Data Integrity**: Verify data integrity
- **User Testing**: Conduct user acceptance testing
- **Monitoring**: Monitor for issues in production

### 4. Documentation
- **Migration Scripts**: Document all migration scripts
- **Schema Changes**: Document schema changes
- **API Changes**: Document API changes
- **Troubleshooting**: Document common issues and solutions

## Common Migration Issues

### 1. Data Type Mismatches
```typescript
// Handle data type conversions
const migrateUserAges = async () => {
  const users = await User.getAll();
  
  for (const user of users) {
    // Convert string age to number
    if (typeof user.age === 'string') {
      user.age = parseInt(user.age, 10);
      await user.save();
    }
  }
};
```

### 2. Missing Fields
```typescript
// Handle missing required fields
const addMissingFields = async () => {
  const users = await User.getAll();
  
  for (const user of users) {
    if (!user.role) {
      user.role = 'user'; // Default role
    }
    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
    }
    await user.save();
  }
};
```

### 3. Relationship Updates
```typescript
// Update relationships after migration
const updateRelationships = async () => {
  const posts = await Post.getAll();
  
  for (const post of posts) {
    // Update foreign key references
    if (post.authorId) {
      const author = await User.findOne('legacyId', '==', post.authorId);
      if (author) {
        post.authorId = author.getId();
        await post.save();
      }
    }
  }
};
```

This migration guide provides comprehensive strategies for upgrading Firebase ORM versions and migrating from other ORMs. Remember to always test migrations thoroughly before applying them to production data.