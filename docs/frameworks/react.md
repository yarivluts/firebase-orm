# React Integration

This guide shows how to integrate Firebase ORM with React applications, covering Create React App, Vite, and custom setups with hooks, context, and state management.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase moment --save
```

For development tools:
```bash
npm install --save-dev @types/node
```

### 2. TypeScript Configuration

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src"]
}
```

### 3. Environment Configuration

Create a `.env` file:

```bash
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## Firebase Setup

### Firebase Configuration

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Firebase ORM
FirestoreOrmRepository.initGlobalConnection(firestore);

export { firestore, app };
```

### Initialize in App

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FirebaseProvider } from './context/FirebaseContext';
import { UserProvider } from './context/UserContext';
import UserList from './components/UserList';
import UserDetail from './components/UserDetail';
import CreateUser from './components/CreateUser';
import Navigation from './components/Navigation';
import './config/firebase'; // Initialize Firebase

import './App.css';

function App() {
  return (
    <FirebaseProvider>
      <UserProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<UserList />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="/create" element={<CreateUser />} />
              </Routes>
            </main>
          </div>
        </Router>
      </UserProvider>
    </FirebaseProvider>
  );
}

export default App;
```

## Model Definition

```typescript
// src/models/User.ts
import { BaseModel, Model, Field, HasMany } from '@arbel/firebase-orm';
import { Post } from './Post';

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

  @Field({ is_required: false })
  public avatar?: string;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  // React-specific helper methods
  toJSON() {
    return {
      id: this.getId(),
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      bio: this.bio,
      avatar: this.avatar,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const users = await User.query().where('email', '==', email).get();
    return users.length > 0 ? users[0] : null;
  }

  getDisplayName(): string {
    return this.name || this.email;
  }

  getInitials(): string {
    return this.name
      ? this.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : this.email[0].toUpperCase();
  }
}
```

## Context and State Management

### Firebase Context

```typescript
// src/context/FirebaseContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { firestore } from '../config/firebase';
import { Firestore } from 'firebase/firestore';

interface FirebaseContextType {
  firestore: Firestore;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const value = {
    firestore,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
```

### User Context with State Management

```typescript
// src/context/UserContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User } from '../models/User';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  selectedUser: User | null;
}

type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'SET_SELECTED_USER'; payload: User | null };

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
  selectedUser: null,
};

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USERS':
      return { ...state, users: action.payload, loading: false, error: null };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.getId() === action.payload.getId() ? action.payload : user
        ),
        selectedUser: state.selectedUser?.getId() === action.payload.getId() 
          ? action.payload 
          : state.selectedUser
      };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.getId() !== action.payload),
        selectedUser: state.selectedUser?.getId() === action.payload 
          ? null 
          : state.selectedUser
      };
    case 'SET_SELECTED_USER':
      return { ...state, selectedUser: action.payload };
    default:
      return state;
  }
}

interface UserContextType extends UserState {
  loadUsers: () => Promise<void>;
  createUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  loadUser: (id: string) => Promise<User>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load all users
  const loadUsers = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const users = await User.getAll();
      dispatch({ type: 'SET_USERS', payload: users });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load users' 
      });
    }
  };

  // Create user
  const createUser = async (userData: Partial<User>): Promise<User> => {
    try {
      const user = new User();
      user.initFromData(userData);
      user.createdAt = new Date().toISOString();
      await user.save();
      
      dispatch({ type: 'ADD_USER', payload: user });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Update user
  const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
    try {
      const user = await User.init(id);
      if (!user) {
        throw new Error('User not found');
      }
      user.initFromData(updates);
      await user.save();
      
      dispatch({ type: 'UPDATE_USER', payload: user });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (id: string): Promise<void> => {
    try {
      const user = await User.init(id);
      if (!user) {
        throw new Error('User not found');
      }
      await user.destroy();
      
      dispatch({ type: 'DELETE_USER', payload: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Load single user
  const loadUser = async (id: string): Promise<User> => {
    try {
      const user = await User.init(id);
      if (!user) {
        throw new Error('User not found');
      }
      dispatch({ type: 'SET_SELECTED_USER', payload: user });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = User.onList((user: User) => {
      dispatch({ type: 'UPDATE_USER', payload: user });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value: UserContextType = {
    ...state,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    loadUser,
    clearError,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}
```

## Custom Hooks

### useFirebaseORM Hook

```typescript
// src/hooks/useFirebaseORM.ts
import { useState, useEffect, useCallback } from 'react';

export function useFirebaseORM<T extends any>(
  ModelClass: new () => T,
  options: {
    realtime?: boolean;
    autoLoad?: boolean;
  } = {}
) {
  const [data, setData] = useState<T[]>([]);
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
        setData(prev => [...prev, item]);
      }

      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      throw err;
    }
  }, [ModelClass, options.realtime]);

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
        setData(prev => prev.map(d => (d as any).getId() === id ? item : d));
      }

      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    }
  }, [ModelClass, options.realtime]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const item = await (ModelClass as any).init(id);
      if (!item) {
        throw new Error('Item not found');
      }
      await (item as any).destroy();

      if (!options.realtime) {
        setData(prev => prev.filter(d => (d as any).getId() !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  }, [ModelClass, options.realtime]);

  // Auto-load data on mount
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadData();
    }
  }, [loadData, options.autoLoad]);

  // Set up real-time subscription
  useEffect(() => {
    if (options.realtime) {
      const unsubscribe = (ModelClass as any).onList((item: T) => {
        setData(currentData => {
          const index = currentData.findIndex(d => (d as any).getId() === (item as any).getId());
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
  }, [ModelClass, options.realtime]);

  return {
    data,
    loading,
    error,
    loadData,
    createItem,
    updateItem,
    deleteItem,
    setError,
  };
}
```

### useUser Hook

```typescript
// src/hooks/useUser.ts
import { useState, useEffect } from 'react';
import { User } from '../models/User';

export function useUser(userId?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const loadUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const userInstance = await User.init(userId);
        if (!userInstance) {
          throw new Error('User not found');
        }
        setUser(userInstance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  const loadUserPosts = async () => {
    if (!user) return [];

    try {
      const posts = await user.loadHasMany('posts');
      // Update user with loaded posts
      setUser({ ...user, posts });
      return posts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user posts');
      return [];
    }
  };

  return {
    user,
    loading,
    error,
    loadUserPosts,
  };
}
```

## Components

### User List Component

```typescript
// src/components/UserList.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import UserCard from './UserCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const UserList: React.FC = () => {
  const { users, loading, error, loadUsers, deleteUser, clearError } = useUsers();

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        // Error is handled by context
        console.error('Failed to delete user:', error);
      }
    }
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <Link
          to="/create"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Add User
        </Link>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={clearError}
        />
      )}

      {users.length === 0 && !loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No users found</p>
          <Link
            to="/create"
            className="text-blue-500 hover:text-blue-600 mt-2 inline-block"
          >
            Create your first user
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => (
            <UserCard
              key={user.getId()}
              user={user}
              onDelete={handleDeleteUser}
            />
          ))}
        </div>
      )}

      {loading && users.length > 0 && (
        <div className="text-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </div>
  );
};

export default UserList;
```

### User Card Component

```typescript
// src/components/UserCard.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../models/User';

interface UserCardProps {
  user: User;
  onDelete: (userId: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const handleLoadPosts = async () => {
    if (loadingPosts) return;

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 font-medium">
                  {user.getInitials()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user.getDisplayName()}
              </h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <Link
                    to={`/users/${user.getId()}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={handleLoadPosts}
                    disabled={loadingPosts}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {loadingPosts ? 'Loading Posts...' : 'Load Posts'}
                  </button>
                  <button
                    onClick={() => {
                      onDelete(user.getId());
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {user.bio && (
          <p className="mt-3 text-sm text-gray-600">{user.bio}</p>
        )}

        <div className="mt-4 text-xs text-gray-500">
          Created: {formatDate(user.createdAt)}
        </div>

        {posts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Posts ({posts.length})
            </h4>
            <div className="space-y-1">
              {posts.slice(0, 3).map((post, index) => (
                <div key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                  {post.title}
                </div>
              ))}
              {posts.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{posts.length - 3} more posts
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
```

### User Detail Component

```typescript
// src/components/UserDetail.tsx
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, error, loadUserPosts } = useUser(id);

  const handleLoadPosts = async () => {
    try {
      await loadUserPosts();
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onDismiss={() => navigate('/users')}
      />
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">User not found</p>
        <Link
          to="/users"
          className="text-blue-500 hover:text-blue-600 mt-2 inline-block"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to="/users"
          className="text-blue-500 hover:text-blue-600 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 font-medium text-2xl">
                  {user.getInitials()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.getDisplayName()}
              </h1>
              <p className="text-lg text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          {user.bio && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Bio</h2>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Posts</h2>
              <button
                onClick={handleLoadPosts}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Load Posts
              </button>
            </div>

            {user.posts ? (
              user.posts.length > 0 ? (
                <div className="grid gap-4">
                  {user.posts.map((post, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md">
                      <h3 className="font-medium text-gray-900">{post.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{post.content}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No posts found</p>
              )
            ) : (
              <p className="text-gray-500">Click "Load Posts" to view user posts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
```

### Create User Form

```typescript
// src/components/CreateUser.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import ErrorMessage from './ErrorMessage';

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const { createUser, loading } = useUsers();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      await createUser(formData);
      navigate('/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New User</h1>

      {error && (
        <ErrorMessage 
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              id="avatar"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;
```

## Utility Components

### Loading Spinner

```typescript
// src/components/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex justify-center items-center py-8">
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`}
      />
    </div>
  );
};

export default LoadingSpinner;
```

### Error Message

```typescript
// src/components/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-800">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
```

## State Management with Redux Toolkit

If you prefer Redux Toolkit for state management:

```typescript
// src/store/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../models/User';

interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const users = await User.getAll();
  return users;
});

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: Partial<User>) => {
    const user = new User();
    user.initFromData(userData);
    user.createdAt = new Date().toISOString();
    await user.save();
    return user;
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, updates }: { id: string; updates: Partial<User> }) => {
    const user = await User.init(id);
    if (!user) {
      throw new Error('User not found');
    }
    user.initFromData(updates);
    await user.save();
    return user;
  }
);

export const deleteUser = createAsyncThunk('users/deleteUser', async (id: string) => {
  const user = await User.init(id);
  if (!user) {
    throw new Error('User not found');
  }
  await user.destroy();
  return id;
});

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      })
      // Create user
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.push(action.payload);
      })
      // Update user
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.getId() === action.payload.getId());
        if (index >= 0) {
          state.users[index] = action.payload;
        }
      })
      // Delete user
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.getId() !== action.payload);
      });
  },
});

export const { clearError, setSelectedUser } = userSlice.actions;
export default userSlice.reducer;
```

## Testing

### Jest Setup

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('./config/firebase', () => ({
  firestore: {},
  app: {},
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
      get: jest.fn(() => Promise.resolve([])),
    }));
    static onList = jest.fn(() => jest.fn());
  },
  Model: () => (target: any) => target,
  Field: () => (target: any, propertyKey: string) => {},
  HasMany: () => (target: any, propertyKey: string) => {},
}));
```

### Component Tests

```typescript
// src/components/__tests__/UserCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserCard from '../UserCard';
import { User } from '../../models/User';

// Mock user
const mockUser = {
  getId: () => 'test-id',
  name: 'John Doe',
  email: 'john@example.com',
  getDisplayName: () => 'John Doe',
  getInitials: () => 'JD',
  loadHasMany: jest.fn(() => Promise.resolve([])),
} as unknown as User;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const mockOnDelete = jest.fn();
    
    renderWithRouter(
      <UserCard user={mockUser} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    
    renderWithRouter(
      <UserCard user={mockUser} onDelete={mockOnDelete} />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button'));
    
    // Click delete
    fireEvent.click(screen.getByText('Delete'));

    expect(mockOnDelete).toHaveBeenCalledWith('test-id');
  });
});
```

## Best Practices

### 1. Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
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

### 2. Performance Optimization

```typescript
// Use React.memo for expensive components
const UserCard = React.memo<UserCardProps>(({ user, onDelete }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.user.getId() === nextProps.user.getId();
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return users.filter(user => user.isActive).length;
}, [users]);

// Use useCallback for event handlers
const handleUserSelect = useCallback((userId: string) => {
  setSelectedUser(userId);
}, []);
```

### 3. Code Splitting

```typescript
// Lazy load components
const UserDetail = React.lazy(() => import('./components/UserDetail'));
const CreateUser = React.lazy(() => import('./components/CreateUser'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/users/:id" element={<UserDetail />} />
    <Route path="/create" element={<CreateUser />} />
  </Routes>
</Suspense>
```

## Common Issues

### 1. Decorator Support

Ensure TypeScript configuration includes experimental decorators.

### 2. Real-time Subscriptions

Always clean up subscriptions in useEffect cleanup function.

### 3. State Management

Choose between Context API for simple state and Redux for complex applications.

## Next Steps

- Explore [Vue.js Integration](./vue.md)
- Learn about [Real-time Features](../realtime.md)
- Check [Performance Optimization](../advanced/performance.md)