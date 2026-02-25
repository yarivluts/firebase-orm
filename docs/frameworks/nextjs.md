# Next.js Integration

This guide shows how to integrate Firebase ORM with Next.js applications, covering both App Router (Next.js 13+) and Pages Router, with support for SSR, SSG, and client-side rendering.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase moment --save
```

### 2. TypeScript Configuration

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false,
    "target": "ES2017",
    "lib": ["DOM", "DOM.Iterable", "ES6"]
  }
}
```

### 3. Next.js Configuration

Create or update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@arbel/firebase-orm'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Firebase Admin SDK from being bundled on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

## Environment Configuration

Create environment files:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# For server-side operations (Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Firebase Configuration

### Client-Side Configuration

```typescript
// lib/firebase-client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (avoid multiple initialization)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const firestore = getFirestore(app);

// Initialize Firebase ORM for client-side
if (typeof window !== 'undefined') {
  FirestoreOrmRepository.initGlobalConnection(firestore);
}

export { firestore };
```

### Server-Side Configuration

```typescript
// lib/firebase-admin.ts
import admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const adminFirestore = admin.firestore();

// Initialize Firebase ORM for server-side operations
FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');

export { adminFirestore };
```

## Model Definition

```typescript
// models/user.model.ts
import { BaseModel, Model, Field, HasMany } from '@arbel/firebase-orm';
import { Post } from './post.model';

@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @Field({ is_required: true })
  public email!: string;

  @Field({ field_name: 'created_at' })
  public createdAt?: string;

  @Field({ is_required: false })
  public bio?: string;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  // Helper method for Next.js
  toJSON() {
    return {
      id: this.getId(),
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      bio: this.bio,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const users = await User.query().where('email', '==', email).get();
    return users.length > 0 ? users[0] : null;
  }
}
```

## App Router (Next.js 13+)

### Server Components

```typescript
// app/users/page.tsx
import { adminFirestore } from '@/lib/firebase-admin';
import { User } from '@/models/user.model';
import { UsersList } from '@/components/UsersList';
import { Suspense } from 'react';

// This is a Server Component
async function getUsers(): Promise<User[]> {
  // Use admin connection for server-side rendering
  FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');
  return await User.getAll();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <Suspense fallback={<div>Loading users...</div>}>
        <UsersList initialUsers={users.map(user => user.toJSON())} />
      </Suspense>
    </div>
  );
}

// Optional: Enable ISR
export const revalidate = 60; // Revalidate every 60 seconds
```

### Client Components

```typescript
// components/UsersList.tsx
'use client';

import { useState, useEffect } from 'react';
import { User } from '@/models/user.model';
import { firestore } from '@/lib/firebase-client';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

interface UsersListProps {
  initialUsers: any[];
}

export function UsersList({ initialUsers }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize client-side Firebase ORM
    FirestoreOrmRepository.initGlobalConnection(firestore);
    
    // Convert initial data to User instances
    const userInstances = initialUsers.map(userData => {
      const user = new User();
      user.initFromData(userData);
      return user;
    });
    setUsers(userInstances);

    // Set up real-time subscription
    const unsubscribe = User.onList((user: User) => {
      setUsers(currentUsers => {
        const index = currentUsers.findIndex(u => u.getId() === user.getId());
        if (index >= 0) {
          const newUsers = [...currentUsers];
          newUsers[index] = user;
          return newUsers;
        }
        return [...currentUsers, user];
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialUsers]);

  const createUser = async (userData: { name: string; email: string; bio?: string }) => {
    setLoading(true);
    try {
      const user = new User();
      user.initFromData(userData);
      user.createdAt = new Date().toISOString();
      await user.save();
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure?')) return;
    
    try {
      const user = await User.init(userId);
      if (user) {
        await user.destroy();
        // Real-time listener will update the UI automatically
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div>
      <CreateUserForm onSubmit={createUser} loading={loading} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {users.map(user => (
          <UserCard 
            key={user.getId()} 
            user={user} 
            onDelete={deleteUser}
          />
        ))}
      </div>
    </div>
  );
}

// Form component
function CreateUserForm({ onSubmit, loading }: { 
  onSubmit: (data: any) => void; 
  loading: boolean; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', bio: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New User</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <textarea
        placeholder="Bio (optional)"
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-md"
        rows={3}
      />
      
      <button
        type="submit"
        disabled={loading}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}

// User card component
function UserCard({ user, onDelete }: { user: User; onDelete: (id: string) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const userPosts = await user.loadHasMany('posts');
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
      {user.bio && <p className="text-sm text-gray-500 mt-2">{user.bio}</p>}
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={loadPosts}
          disabled={loadingPosts}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          {loadingPosts ? 'Loading...' : 'Load Posts'}
        </button>
        
        <button
          onClick={() => onDelete(user.getId())}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>

      {posts.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium text-sm">Posts ({posts.length})</h4>
          {posts.map((post, index) => (
            <div key={index} className="text-xs text-gray-600 mt-1">
              {post.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Pages Router (Traditional Next.js)

### Static Generation (SSG)

```typescript
// pages/users/index.tsx
import { GetStaticProps } from 'next';
import { adminFirestore } from '@/lib/firebase-admin';
import { User } from '@/models/user.model';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

interface UsersPageProps {
  users: any[];
}

export default function UsersPage({ users }: UsersPageProps) {
  // Component implementation similar to App Router example
  return (
    <div>
      <h1>Users (Static Generation)</h1>
      {/* Render users */}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  // Initialize admin connection for build-time data fetching
  FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');
  
  try {
    const users = await User.getAll();
    
    return {
      props: {
        users: users.map(user => user.toJSON()),
      },
      // Enable ISR - revalidate every 60 seconds
      revalidate: 60,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      props: {
        users: [],
      },
      revalidate: 60,
    };
  }
};
```

### Server-Side Rendering (SSR)

```typescript
// pages/users/[id].tsx
import { GetServerSideProps } from 'next';
import { adminFirestore } from '@/lib/firebase-admin';
import { User } from '@/models/user.model';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

interface UserPageProps {
  user: any | null;
  error?: string;
}

export default function UserPage({ user, error }: UserPageProps) {
  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {user.bio && <p>{user.bio}</p>}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const { id } = params!;
  
  // Initialize admin connection for server-side rendering
  FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');
  
  try {
    const user = await User.init(id as string);
    if (!user) {
      return {
        notFound: true,
      };
    }
    
    return {
      props: {
        user: user.toJSON(),
      },
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    
    return {
      props: {
        user: null,
        error: 'User not found',
      },
    };
  }
};
```

## API Routes

### REST API with Firebase ORM

```typescript
// pages/api/users/index.ts (or app/api/users/route.ts for App Router)
import { NextApiRequest, NextApiResponse } from 'next';
import { adminFirestore } from '@/lib/firebase-admin';
import { User } from '@/models/user.model';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize admin connection for API routes
FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  const { limit = 10, offset = 0 } = req.query;
  
  const users = await User.query()
    .limit(Number(limit))
    .startAfter(Number(offset))
    .get();
    
  const totalCount = await User.count();
  
  return res.status(200).json({
    users: users.map(user => user.toJSON()),
    pagination: {
      total: totalCount,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
}

async function createUser(req: NextApiRequest, res: NextApiResponse) {
  const { name, email, bio } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }
  
  const user = new User();
  user.name = name;
  user.email = email;
  user.bio = bio;
  user.createdAt = new Date().toISOString();
  
  await user.save();
  
  return res.status(201).json(user.toJSON());
}
```

### App Router API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase-admin';
import { User } from '@/models/user.model';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize admin connection
FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 10;
    const offset = Number(searchParams.get('offset')) || 0;
    
    const users = await User.query()
      .limit(limit)
      .startAfter(offset)
      .get();
      
    return NextResponse.json({
      users: users.map(user => user.toJSON()),
      pagination: { limit, offset },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, bio } = body;
    
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    const user = new User();
    user.name = name;
    user.email = email;
    user.bio = bio;
    user.createdAt = new Date().toISOString();
    
    await user.save();
    
    return NextResponse.json(user.toJSON(), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## Hooks for Client-Side Data Management

```typescript
// hooks/useFirebaseORM.ts
import { useState, useEffect, useCallback } from 'react';
import { firestore } from '@/lib/firebase-client';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

// Initialize client-side connection
if (typeof window !== 'undefined') {
  FirestoreOrmRepository.initGlobalConnection(firestore);
}

export function useFirebaseORM<T extends any>(
  ModelClass: new () => T,
  options: {
    realtime?: boolean;
    initialData?: any[];
  } = {}
) {
  const [data, setData] = useState<T[]>(options.initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const items = await (ModelClass as any).getAll();
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [ModelClass]);

  // Create item
  const createItem = useCallback(async (itemData: Partial<T>) => {
    try {
      const item = new ModelClass();
      item.initFromData(itemData);
      await (item as any).save();
      
      if (!options.realtime) {
        await loadData(); // Refresh data if not using realtime
      }
      
      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      throw err;
    }
  }, [ModelClass, options.realtime, loadData]);

  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const item = await (ModelClass as any).init(id);
      if (!item) {
        throw new Error('Item not found');
      }
      item.initFromData(updates);
      await (item as any).save();
      
      if (!options.realtime) {
        await loadData(); // Refresh data if not using realtime
      }
      
      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    }
  }, [ModelClass, options.realtime, loadData]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const item = await (ModelClass as any).init(id);
      if (!item) {
        throw new Error('Item not found');
      }
      await (item as any).destroy();
      
      if (!options.realtime) {
        await loadData(); // Refresh data if not using realtime
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  }, [ModelClass, options.realtime, loadData]);

  useEffect(() => {
    if (!options.initialData) {
      loadData();
    }

    if (options.realtime) {
      // Set up real-time subscription
      const unsubscribe = (ModelClass as any).onList((item: T) => {
        setData(currentData => {
          const index = currentData.findIndex((d: any) => d.getId() === (item as any).getId());
          if (index >= 0) {
            const newData = [...currentData];
            newData[index] = item;
            return newData;
          }
          return [...currentData, item];
        });
      });

      return unsubscribe;
    }
  }, [ModelClass, options.realtime, options.initialData, loadData]);

  return {
    data,
    loading,
    error,
    loadData,
    createItem,
    updateItem,
    deleteItem,
  };
}
```

### Using the Hook

```typescript
// components/UsersWithHook.tsx
'use client';

import { useFirebaseORM } from '@/hooks/useFirebaseORM';
import { User } from '@/models/user.model';

export function UsersWithHook({ initialUsers }: { initialUsers: any[] }) {
  const {
    data: users,
    loading,
    error,
    createItem: createUser,
    updateItem: updateUser,
    deleteItem: deleteUser,
  } = useFirebaseORM(User, {
    realtime: true,
    initialData: initialUsers,
  });

  const handleCreateUser = async (userData: { name: string; email: string }) => {
    try {
      await createUser({
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Your UI here */}
      {users.map(user => (
        <div key={(user as any).getId()}>
          {/* User display */}
        </div>
      ))}
    </div>
  );
}
```

## Deployment Considerations

### Vercel Deployment

1. **Environment Variables**: Set all environment variables in Vercel dashboard
2. **Build Configuration**: Ensure `next.config.js` is properly configured
3. **Function Regions**: Consider using edge functions for better performance

### Other Platforms

- **Netlify**: Similar setup, use Netlify environment variables
- **Railway/Render**: Standard Node.js deployment with environment variables
- **Google Cloud Run**: Native Firebase integration

## Best Practices

### 1. Separate Client and Server Logic

Always use different Firebase instances for client and server operations.

### 2. Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3. Loading States

Always provide loading states for better UX.

### 4. Data Serialization

Use `toJSON()` methods to ensure proper serialization for SSR/SSG.

## Common Issues

### 1. Hydration Mismatch

Ensure client and server render the same initial state.

### 2. Firebase Admin in Client Bundle

Use proper webpack configuration to prevent server-only code from being bundled.

### 3. Environment Variables

Prefix client-side variables with `NEXT_PUBLIC_`.

## Next Steps

- Explore [Real-time Features](../realtime.md)
- Learn about [Performance Optimization](../advanced/performance.md)
- Check [Security Best Practices](../advanced/security.md)