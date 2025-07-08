# Installation & Setup

This guide will help you install and configure Firebase ORM in your project.

## Prerequisites

Before installing Firebase ORM, ensure you have:
- Node.js 14 or higher
- A Firebase project with Firestore enabled
- TypeScript 3.3 or higher (recommended)

## Installation

### For Client-Side Applications

Install Firebase ORM with the client Firebase SDK:

```bash
npm install @arbel/firebase-orm firebase rxfire moment --save
```

### For Server-Side Applications (Node.js)

For backend applications using Firebase Admin SDK:

```bash
npm install @arbel/firebase-orm firebase-admin moment --save
```

## TypeScript Configuration

If you're using TypeScript, ensure these settings are enabled in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "target": "ES2017",
    "lib": ["ES2017", "DOM"]
  }
}
```

You may also need to enable `es6` in the `lib` section or install `es6-shim` from `@types`.

## Module Format Support

Firebase ORM supports both CommonJS (CJS) and ECMAScript Modules (ESM):

### CommonJS (Node.js, older bundlers)
```javascript
const { FirestoreOrmRepository, BaseModel, Field, Model } = require("@arbel/firebase-orm");
```

### ESM (modern bundlers, TypeScript with ESM)
```javascript
import { FirestoreOrmRepository, BaseModel, Field, Model } from "@arbel/firebase-orm";
```

## Firebase Configuration

### Client-Side Setup (Web Apps)

1. **Initialize Firebase App**:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Firebase ORM
FirestoreOrmRepository.initGlobalConnection(firestore);
```

### Server-Side Setup (Node.js with Admin SDK)

1. **Using Service Account**:

```typescript
import admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com"
});

const firestore = admin.firestore();
FirestoreOrmRepository.initGlobalConnection(firestore);
```

2. **Using Default Credentials (Google Cloud)**:

```typescript
import admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize with default credentials
admin.initializeApp();

const firestore = admin.firestore();
FirestoreOrmRepository.initGlobalConnection(firestore);
```

## Environment Variables

For production applications, use environment variables:

```typescript
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

Create a `.env` file in your project root:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
```

## Verification

Test your setup with a simple model:

```typescript
import { BaseModel, Model, Field } from '@arbel/firebase-orm';

@Model({
  reference_path: 'test',
  path_id: 'test_id'
})
export class TestModel extends BaseModel {
  @Field({ is_required: true })
  public name!: string;
}

// Test the connection
async function testConnection() {
  const test = new TestModel();
  test.name = 'Hello Firebase ORM!';
  
  try {
    await test.save();
    console.log('✅ Firebase ORM setup successful!', test.getId());
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

testConnection();
```

## Next Steps

Now that you have Firebase ORM installed and configured:

1. Read the [Quick Start Guide](./quick-start.md) to create your first model
2. Learn about [Basic Concepts](./basic-concepts.md)
3. Check out framework-specific setup in the [Framework Integration](./frameworks/) section

## Troubleshooting

### Common Issues

**"Cannot find module" errors**: Make sure all dependencies are installed and TypeScript configuration is correct.

**"Firestore is not initialized" error**: Ensure you've called `FirestoreOrmRepository.initGlobalConnection()` before using any models.

**Decorator errors**: Verify that `experimentalDecorators` and `emitDecoratorMetadata` are enabled in your TypeScript configuration.

For more help, see the [Troubleshooting Guide](./guides/troubleshooting.md).