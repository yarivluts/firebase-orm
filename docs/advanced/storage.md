# Firebase Storage

Firebase ORM provides seamless integration with Firebase Storage for file uploads and management. This allows you to easily handle file uploads, downloads, and URL generation directly from your models.

## Setup

### Initialize Firebase Storage Connection

```typescript
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
FirestoreOrmRepository.initGlobalStorage(storage);
```

### With Firebase Admin SDK

```typescript
import * as admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-project-id.appspot.com'
});

const adminStorage = admin.storage();
FirestoreOrmRepository.initGlobalStorage(adminStorage);
```

## Basic Usage

### Model Definition

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false, field_name: "photo_url" })
  public photoUrl?: string;

  @Field({ is_required: false, field_name: "gallery_urls" })
  public galleryUrls?: string[];

  @Field({ is_required: false, field_name: "document_url" })
  public documentUrl?: string;
}
```

### Getting Storage Reference

```typescript
// Get storage reference for a field
const product = new Product();
product.name = "Test Product";

const storageRef = product.getStorageFile("photoUrl");
```

## File Upload Methods

### Upload from File Object

```typescript
const product = new Product();
product.name = "Test Product";

// Upload file (e.g., from file input)
const file = document.getElementById('fileInput').files[0];
await product.getStorageFile("photoUrl").uploadFile(file);

// Save the model (photoUrl will be automatically set)
await product.save();
```

### Upload from Base64 String

```typescript
const product = new Product();
product.name = "Test Product";

// Upload from base64 string
const base64String = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...";
await product.getStorageFile("photoUrl").uploadString(base64String, 'base64');

// Save the model
await product.save();
```

### Upload from URL (Copy to Storage)

```typescript
const product = new Product();
product.name = "Test Product";

// Copy file from external URL to Firebase Storage
const externalUrl = "https://example.com/image.jpg";
await product.getStorageFile("photoUrl").uploadFromUrl(externalUrl);

// Save the model
await product.save();
```

### Upload from Buffer (Node.js)

```typescript
const product = new Product();
product.name = "Test Product";

// Upload from buffer (server-side)
const buffer = Buffer.from(imageData);
await product.getStorageFile("photoUrl").uploadBuffer(buffer, 'image/jpeg');

// Save the model
await product.save();
```

## Upload Progress Tracking

```typescript
const product = new Product();
product.name = "Test Product";

const storageRef = product.getStorageFile("photoUrl");

await storageRef.uploadFromUrl(
  "https://example.com/image.jpg",
  // Progress callback
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log(`Upload progress: ${progress}%`);
    
    switch (snapshot.state) {
      case 'paused':
        console.log('Upload paused');
        break;
      case 'running':
        console.log('Upload running');
        break;
    }
  },
  // Error callback
  (error) => {
    console.error('Upload failed:', error);
  },
  // Complete callback
  (task) => {
    console.log('Upload completed successfully');
    task.snapshot.ref.getDownloadURL().then((downloadURL) => {
      console.log('File available at:', downloadURL);
    });
  }
);

await product.save();
```

## File Management

### Get Storage Reference

```typescript
const product = new Product();
await product.load('product-id');

// Get Firebase Storage reference
const ref = product.getStorageFile("photoUrl").getRef();
console.log('Storage path:', ref.fullPath);
```

### Download File

```typescript
const product = new Product();
await product.load('product-id');

const storageRef = product.getStorageFile("photoUrl");

// Get download URL
const downloadURL = await storageRef.getDownloadURL();
console.log('Download URL:', downloadURL);

// Download file as blob (browser)
const blob = await storageRef.getBlob();

// Download file as buffer (Node.js)
const buffer = await storageRef.getBuffer();
```

### Delete File

```typescript
const product = new Product();
await product.load('product-id');

// Delete file from storage
await product.getStorageFile("photoUrl").delete();

// Clear the URL from the model
product.photoUrl = null;
await product.save();
```

### File Metadata

```typescript
const product = new Product();
await product.load('product-id');

// Get file metadata
const metadata = await product.getStorageFile("photoUrl").getMetadata();
console.log('File size:', metadata.size);
console.log('Content type:', metadata.contentType);
console.log('Created:', metadata.timeCreated);
```

## Multiple File Uploads

### Gallery/Array Fields

```typescript
@Model({
  reference_path: "products",
  path_id: "product_id"
})
export class Product extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false, field_name: "gallery_urls" })
  public galleryUrls?: string[];
}

// Upload multiple files
const product = new Product();
product.name = "Test Product";

const files = document.getElementById('fileInput').files;
const uploadPromises = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const storageRef = product.getStorageFile(`gallery_${i}`);
  uploadPromises.push(storageRef.uploadFile(file));
}

// Wait for all uploads to complete
const results = await Promise.all(uploadPromises);
product.galleryUrls = results.map(result => result.downloadURL);

await product.save();
```

### Organized File Structure

```typescript
// Upload with custom path structure
const product = new Product();
product.name = "Test Product";

// Files will be organized as: products/{product_id}/images/photo.jpg
const storageRef = product.getStorageFile("photoUrl", {
  customPath: `products/${product.getId()}/images/photo.jpg`
});

await storageRef.uploadFile(file);
await product.save();
```

## Advanced Features

### Custom Storage Paths

```typescript
const product = new Product();
product.name = "Test Product";

// Define custom storage path
const customPath = `products/${product.getId()}/images/${Date.now()}.jpg`;
const storageRef = product.getStorageFile("photoUrl", { customPath });

await storageRef.uploadFile(file);
await product.save();
```

### File Validation

```typescript
const product = new Product();
product.name = "Test Product";

// Validate file before upload
const file = document.getElementById('fileInput').files[0];

// Check file size (max 5MB)
if (file.size > 5 * 1024 * 1024) {
  throw new Error('File size exceeds 5MB limit');
}

// Check file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}

// Upload if validation passes
await product.getStorageFile("photoUrl").uploadFile(file);
await product.save();
```

### Image Processing

```typescript
const product = new Product();
product.name = "Test Product";

// Upload original image
const originalFile = document.getElementById('fileInput').files[0];
await product.getStorageFile("photoUrl").uploadFile(originalFile);

// Create thumbnail (client-side using canvas)
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();

img.onload = async () => {
  // Resize to thumbnail
  canvas.width = 200;
  canvas.height = 200;
  ctx.drawImage(img, 0, 0, 200, 200);
  
  // Convert to blob
  canvas.toBlob(async (blob) => {
    await product.getStorageFile("thumbnailUrl").uploadFile(blob);
    await product.save();
  }, 'image/jpeg', 0.8);
};

img.src = URL.createObjectURL(originalFile);
```

## Error Handling

### Upload Errors

```typescript
const product = new Product();
product.name = "Test Product";

try {
  await product.getStorageFile("photoUrl").uploadFile(file);
  await product.save();
} catch (error) {
  if (error.code === 'storage/unauthorized') {
    console.error('User not authorized to upload files');
  } else if (error.code === 'storage/quota-exceeded') {
    console.error('Storage quota exceeded');
  } else if (error.code === 'storage/invalid-format') {
    console.error('Invalid file format');
  } else {
    console.error('Upload failed:', error);
  }
}
```

### Download Errors

```typescript
const product = new Product();
await product.load('product-id');

try {
  const downloadURL = await product.getStorageFile("photoUrl").getDownloadURL();
  console.log('Download URL:', downloadURL);
} catch (error) {
  if (error.code === 'storage/object-not-found') {
    console.error('File not found in storage');
  } else if (error.code === 'storage/unauthorized') {
    console.error('User not authorized to download file');
  } else {
    console.error('Download failed:', error);
  }
}
```

## Security and Best Practices

### Storage Security Rules

```javascript
// Firebase Storage Security Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only upload their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Product images can be read by everyone, written by authenticated users
    match /products/{productId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Restrict file size (5MB max)
    match /{allPaths=**} {
      allow write: if request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### File Organization

```typescript
// Organize files by model type and ID
const getUserStoragePath = (userId: string, fileName: string) => {
  return `users/${userId}/files/${fileName}`;
};

const getProductStoragePath = (productId: string, fileName: string) => {
  return `products/${productId}/images/${fileName}`;
};

// Use organized paths
const product = new Product();
const customPath = getProductStoragePath(product.getId(), 'main-image.jpg');
const storageRef = product.getStorageFile("photoUrl", { customPath });
```

### Cleanup Strategies

```typescript
// Clean up old files when updating
const product = new Product();
await product.load('product-id');

// Delete old file before uploading new one
if (product.photoUrl) {
  await product.getStorageFile("photoUrl").delete();
}

// Upload new file
await product.getStorageFile("photoUrl").uploadFile(newFile);
await product.save();
```

## Performance Optimization

### Lazy Loading

```typescript
// Load models without immediately loading file URLs
const products = await Product.getAll();

// Load file URLs only when needed
const displayProducts = await Promise.all(
  products.map(async (product) => {
    if (product.photoUrl) {
      const downloadURL = await product.getStorageFile("photoUrl").getDownloadURL();
      return { ...product, displayPhotoUrl: downloadURL };
    }
    return product;
  })
);
```

### Caching Download URLs

```typescript
// Cache download URLs to avoid repeated requests
const urlCache = new Map<string, string>();

const getCachedDownloadURL = async (product: Product): Promise<string> => {
  const cacheKey = `${product.getId()}_photoUrl`;
  
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey)!;
  }
  
  const downloadURL = await product.getStorageFile("photoUrl").getDownloadURL();
  urlCache.set(cacheKey, downloadURL);
  
  // Cache for 1 hour
  setTimeout(() => {
    urlCache.delete(cacheKey);
  }, 60 * 60 * 1000);
  
  return downloadURL;
};
```

### Batch Operations

```typescript
// Upload multiple files in parallel
const uploadFiles = async (product: Product, files: File[]) => {
  const uploadPromises = files.map(async (file, index) => {
    const fieldName = `gallery_${index}`;
    return product.getStorageFile(fieldName).uploadFile(file);
  });
  
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.downloadURL);
};
```

## Integration Examples

### React Component

```typescript
import React, { useState } from 'react';
import { Product } from './models/Product';

const ProductUpload: React.FC = () => {
  const [product, setProduct] = useState(new Product());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      await product.getStorageFile("photoUrl").uploadFile(file, {
        onProgress: (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        }
      });

      await product.save();
      console.log('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileUpload}
        disabled={uploading}
        accept="image/*"
      />
      {uploading && (
        <div>
          <progress value={progress} max="100" />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
};
```

### Node.js API

```typescript
import express from 'express';
import multer from 'multer';
import { Product } from './models/Product';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/products/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const product = new Product();
    await product.load(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload buffer to Firebase Storage
    await product.getStorageFile("photoUrl").uploadBuffer(
      req.file.buffer,
      req.file.mimetype
    );

    await product.save();

    res.json({ 
      message: 'File uploaded successfully',
      productId: product.getId(),
      photoUrl: product.photoUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Common Use Cases

### Profile Picture Upload

```typescript
@Model({
  reference_path: "users",
  path_id: "user_id"
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: false, field_name: "avatar_url" })
  public avatarUrl?: string;

  async uploadAvatar(file: File): Promise<void> {
    // Delete old avatar if exists
    if (this.avatarUrl) {
      await this.getStorageFile("avatarUrl").delete();
    }

    // Upload new avatar
    const customPath = `users/${this.getId()}/avatar.jpg`;
    await this.getStorageFile("avatarUrl", { customPath }).uploadFile(file);
    
    await this.save();
  }
}
```

### Document Management

```typescript
@Model({
  reference_path: "documents",
  path_id: "document_id"
})
export class Document extends BaseModel {
  @Field({ is_required: true })
  public title!: string;

  @Field({ is_required: false, field_name: "file_url" })
  public fileUrl?: string;

  @Field({ is_required: false, field_name: "file_type" })
  public fileType?: string;

  @Field({ is_required: false, field_name: "file_size" })
  public fileSize?: number;

  async uploadDocument(file: File): Promise<void> {
    // Set file metadata
    this.fileType = file.type;
    this.fileSize = file.size;

    // Upload file
    const customPath = `documents/${this.getId()}/${file.name}`;
    await this.getStorageFile("fileUrl", { customPath }).uploadFile(file);
    
    await this.save();
  }
}
```

### Bulk File Operations

```typescript
const cleanupOrphanedFiles = async (): Promise<void> => {
  const products = await Product.getAll();
  
  // Get all file URLs from database
  const dbFileUrls = new Set<string>();
  products.forEach(product => {
    if (product.photoUrl) dbFileUrls.add(product.photoUrl);
    if (product.galleryUrls) {
      product.galleryUrls.forEach(url => dbFileUrls.add(url));
    }
  });

  // List all files in storage
  const storageFiles = await listAllFiles('products/');
  
  // Delete files not referenced in database
  for (const file of storageFiles) {
    if (!dbFileUrls.has(file.downloadURL)) {
      await file.delete();
      console.log(`Deleted orphaned file: ${file.name}`);
    }
  }
};
```