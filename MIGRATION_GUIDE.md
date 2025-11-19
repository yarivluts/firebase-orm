# Migration Guide

This document outlines breaking changes and migration steps for major updates to Firebase ORM.

---

## Instance Query Method Restrictions (v1.9.78+)

### Overview

Version 1.9.78+ introduces restrictions on instance query methods to enforce proper hierarchical data access patterns and prevent incorrect usage of nested models.

### What Changed?

Instance query methods (such as `getAll()`, `where()`, `query()`, `find()`, `findOne()`, and listener methods like `onList()`) can now **only** be called on models retrieved via `getModel()`.

### Migration Required

#### ❌ Old Pattern (No Longer Works)

```typescript
// This pattern will now throw an error
const categoryModel = new Category();
categoryModel.setPathParams('course_id', this.courseId);
const categories = await categoryModel.getAll(); // ❌ Error!
```

**Error Message:**
```
Instance query methods (getAll, where, query, find, findOne) can only be called on models retrieved via getModel().
Use static methods like Model.getAll() or retrieve the model through a parent: parentModel.getModel(ChildModel).getAll()
```

#### ✅ New Pattern (Correct Approach)

**Option 1: Use Static Methods**
For top-level collections, use static methods:
```typescript
// For models without path parameters
const categories = await Category.getAll();

// With filtering
const activeCategories = await Category
  .where('status', '==', 'active')
  .get();
```

**Option 2: Use `getModel()` for Nested Collections**
For nested collections, retrieve through parent model:
```typescript
// Get the parent first
const course = await Course.findOne('id', '==', courseId);

// Then get nested collection via getModel()
const categories = await course.getModel(Category).getAll();

// With filtering
const activeCategories = await course.getModel(Category)
  .query()
  .where('status', '==', 'active')
  .get();
```

### Why This Change?

This restriction enforces several best practices:

1. **Explicit Relationships**: Makes parent-child relationships clear and explicit in the code
2. **Data Integrity**: Ensures queries are properly scoped to the correct hierarchy level
3. **Security**: Aligns with Firestore security rules that often depend on document hierarchy
4. **Maintainability**: Makes code easier to understand and maintain by showing data flow

### Impact

- **Static methods**: No impact - continue to work as before
- **Direct instantiation with `new Model()`**: No impact for save/load operations
- **Instance query methods**: Must use `getModel()` pattern

### Affected Methods

The following instance methods now require models to be created via `getModel()`:

- `getAll()`
- `where()`
- `query()`
- `find()`
- `findOne()`
- `onList()`
- `onAllList()`
- `onModeList()`
- `onCreatedList()`
- `onUpdatedList()`

---

## Browser Bundle Optimization (v1.9.74+)

### Overview

Version 1.9.74+ introduces optimizations for browser-only applications (like Angular, React, Vue) to ensure that Node.js-specific dependencies (firebase-admin) are properly tree-shaken and don't cause build failures.

## What Changed?

### For Browser/Client SDK Users (No Changes Required!)

If you're using Firebase ORM with the Firebase **Client SDK** in a browser application, **no changes are required**. Your existing code will continue to work:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
FirestoreOrmRepository.initGlobalConnection(firestore);
```

### For Firebase Admin SDK Users (Required Migration)

If you're using Firebase ORM with the Firebase **Admin SDK** in a Node.js environment, you must update your imports to use the dedicated admin entry point:

#### Before (No Longer Available)

```typescript
import { FirestoreOrmRepository } from '@arbel/firebase-orm';
import * as admin from 'firebase-admin';

const app = admin.initializeApp();
// This method no longer exists in the main entry point
await FirestoreOrmRepository.initializeAdminApp(app);
```

#### After (Required)

```typescript
import { initializeAdminApp } from '@arbel/firebase-orm/admin';
import * as admin from 'firebase-admin';

const app = admin.initializeApp();
await initializeAdminApp(app);
```

Alternatively, you can import everything from the admin entry point:

```typescript
import { FirestoreOrmRepository, initializeAdminApp } from '@arbel/firebase-orm/admin';
import * as admin from 'firebase-admin';

const app = admin.initializeApp();
await initializeAdminApp(app);
```

## Why This Change?

Modern JavaScript bundlers (webpack, esbuild, rollup) used by Angular, React, and other frameworks perform static analysis to determine which code to include. Even though the previous implementation had runtime checks (`typeof window !== 'undefined'`), the presence of `import('firebase-admin/firestore')` in the code caused bundlers to try resolving these Node.js-only modules, leading to build failures like:

```
✘ [ERROR] Could not resolve "assert"
✘ [ERROR] Could not resolve "stream"
✘ [ERROR] Could not resolve "http"
```

By moving Admin SDK functionality to a separate entry point (`@arbel/firebase-orm/admin`), bundlers can completely exclude this code when building browser applications.

## Benefits

1. **No Build Failures**: Browser applications no longer encounter errors about missing Node.js modules
2. **Smaller Bundle Sizes**: Admin SDK code is completely tree-shaken from browser builds
3. **Clean Separation**: Admin SDK functionality completely isolated from browser entry point
4. **Better Type Safety**: Clear separation between browser and Node.js environments prevents accidental mixing of environments

## Package.json Configuration

The package now exports two entry points:

```json
{
  "exports": {
    ".": {
      "browser": "./dist/esm/index.js",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./admin": {
      "import": "./dist/esm/admin.js",
      "require": "./dist/cjs/admin.js"
    }
  }
}
```

### TypeScript Configuration

If you're using TypeScript with `moduleResolution: "node16"` or `"bundler"`, the imports will work automatically. For older TypeScript configurations, you may need to add:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Testing Your Migration

After migrating, verify:

1. **For Browser Apps**: Your build should complete without errors about Node.js modules
2. **For Node.js Apps**: Your admin initialization should work as before
3. **Check Bundle Size**: Browser bundles should be smaller (no firebase-admin code included)

## Troubleshooting

### "Cannot find module '@arbel/firebase-orm/admin'"

This usually means:
1. You're using an older version of TypeScript with restrictive module resolution
2. Your bundler doesn't support package.json `exports` field

**Solution**: Update to `moduleResolution: "bundler"` or `"node16"` in tsconfig.json.

### "firebase-admin is not installed"

This is expected! In browser applications, firebase-admin is marked as an optional peer dependency. You only need it for Node.js/Admin SDK usage.

### Still Getting Build Errors in Angular 19

Make sure you're not importing from `@arbel/firebase-orm/admin` in browser code. The admin entry point should only be used in Node.js environments (e.g., server-side rendering, cloud functions, backend services).

## Questions?

If you encounter any issues with this migration, please [open an issue](https://github.com/yarivluts/firebase-orm/issues) on GitHub.
