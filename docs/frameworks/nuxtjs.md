# Nuxt.js Integration

This guide shows how to integrate Firebase ORM with Nuxt.js applications, covering both Nuxt 3 and Nuxt 2, with support for SSR, SSG, and SPA modes.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase moment --save
```

For Nuxt 3, you might also want to install Nuxt Firebase module:

```bash
npm install @nuxtjs/firebase --save-dev
```

### 2. TypeScript Configuration

Update your `tsconfig.json`:

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

### 3. Nuxt Configuration

For **Nuxt 3** (`nuxt.config.ts`):

```typescript
export default defineNuxtConfig({
  // Enable SSR (default)
  ssr: true,
  
  // TypeScript configuration
  typescript: {
    typeCheck: true
  },

  // CSS framework (optional)
  css: ['~/assets/css/main.css'],

  // Runtime config for environment variables
  runtimeConfig: {
    // Private keys (only available on server-side)
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
    }
  },

  // Build configuration
  build: {
    transpile: ['@arbel/firebase-orm']
  },

  // Vite configuration for client-side optimization
  vite: {
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['firebase/firestore', 'firebase/app']
    }
  }
});
```

For **Nuxt 2** (`nuxt.config.js`):

```javascript
export default {
  // Nuxt mode
  mode: 'universal', // or 'spa'
  target: 'server', // or 'static'

  // Build configuration
  build: {
    transpile: ['@arbel/firebase-orm'],
    extend(config, { isClient }) {
      if (!isClient) {
        config.externals = config.externals || [];
        config.externals.push('firebase-admin');
      }
    }
  },

  // Environment variables
  publicRuntimeConfig: {
    firebaseConfig: {
      apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
    }
  },

  privateRuntimeConfig: {
    firebaseAdminConfig: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  }
};
```

## Environment Configuration

Create a `.env` file:

```bash
# Public (client-side) variables
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Private (server-side) variables
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Firebase Setup

### Nuxt 3 Plugin

Create plugins for Firebase initialization:

```typescript
// plugins/firebase.client.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  };

  // Initialize Firebase app
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);

  // Initialize Firebase ORM for client-side
  FirestoreOrmRepository.initGlobalConnection(firestore);

  return {
    provide: {
      firestore
    }
  };
});
```

```typescript
// plugins/firebase.server.ts
import admin from 'firebase-admin';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey,
      }),
    });
  }

  const adminFirestore = admin.firestore();

  // Initialize Firebase ORM for server-side
  FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');

  return {
    provide: {
      adminFirestore
    }
  };
});
```

### Nuxt 2 Plugin

```javascript
// plugins/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

export default ({ $config }, inject) => {
  // Client-side initialization
  if (process.client) {
    const firebaseConfig = $config.firebaseConfig;
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    
    FirestoreOrmRepository.initGlobalConnection(firestore);
    
    inject('firestore', firestore);
  }
  
  // Server-side initialization
  if (process.server) {
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert($config.firebaseAdminConfig),
      });
    }
    
    const adminFirestore = admin.firestore();
    FirestoreOrmRepository.initGlobalConnection(adminFirestore, 'admin');
    
    inject('adminFirestore', adminFirestore);
  }
};
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

  // Nuxt-specific helper methods
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

  getDisplayName(): string {
    return this.name || this.email;
  }
}
```

## Nuxt 3 Pages and Components

### Server-Side Data Fetching

```vue
<!-- pages/users/index.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Users</h1>
    
    <UserForm @user-created="handleUserCreated" />
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
      <UserCard
        v-for="user in users"
        :key="user.id"
        :user="user"
        @user-deleted="handleUserDeleted"
      />
    </div>
  </div>
</template>

<script setup>
import { User } from '~/models/user.model';

// Server-side data fetching
const { data: initialUsers } = await useLazyAsyncData('users', async () => {
  // This runs on server-side, using admin connection
  const users = await User.getAll();
  return users.map(user => user.toJSON());
});

// Reactive users list
const users = ref(initialUsers.value || []);

// Handle user creation
const handleUserCreated = (newUser) => {
  users.value.push(newUser);
};

// Handle user deletion
const handleUserDeleted = (userId) => {
  users.value = users.value.filter(user => user.id !== userId);
};

// Real-time subscription on client-side
onMounted(() => {
  if (process.client) {
    const unsubscribe = User.onList((user) => {
      const index = users.value.findIndex(u => u.id === user.getId());
      
      if (index >= 0) {
        users.value[index] = user.toJSON();
      } else {
        users.value.push(user.toJSON());
      }
    });

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
  }
});

// SEO meta tags
useSeoMeta({
  title: 'Users - Firebase ORM Demo',
  description: 'List of all users in the system',
});
</script>
```

### Dynamic Pages

```vue
<!-- pages/users/[id].vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="pending" class="text-center">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
      <p class="mt-4">Loading user...</p>
    </div>
    
    <div v-else-if="error" class="text-red-600 text-center">
      <p>Error loading user: {{ error.message }}</p>
    </div>
    
    <div v-else-if="user" class="max-w-2xl mx-auto">
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h1 class="text-2xl font-bold mb-4">{{ user.name }}</h1>
        <div class="space-y-2">
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p v-if="user.bio"><strong>Bio:</strong> {{ user.bio }}</p>
          <p><strong>Created:</strong> {{ formatDate(user.createdAt) }}</p>
        </div>
        
        <div class="mt-6">
          <button
            @click="loadUserPosts"
            :disabled="loadingPosts"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {{ loadingPosts ? 'Loading...' : 'Load Posts' }}
          </button>
        </div>
        
        <div v-if="posts.length > 0" class="mt-6">
          <h2 class="text-xl font-semibold mb-4">Posts ({{ posts.length }})</h2>
          <div class="space-y-2">
            <div
              v-for="post in posts"
              :key="post.id"
              class="p-3 bg-gray-50 rounded border"
            >
              <h3 class="font-medium">{{ post.title }}</h3>
              <p class="text-sm text-gray-600">{{ post.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center">
      <p>User not found</p>
    </div>
  </div>
</template>

<script setup>
import { User } from '~/models/user.model';

const route = useRoute();
const userId = route.params.id;

// Server-side data fetching with error handling
const { data: user, pending, error } = await useLazyAsyncData(`user-${userId}`, async () => {
  try {
    const userInstance = new User();
    await userInstance.load(userId);
    return userInstance.toJSON();
  } catch (err) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    });
  }
});

// Client-side posts loading
const posts = ref([]);
const loadingPosts = ref(false);

const loadUserPosts = async () => {
  if (loadingPosts.value) return;
  
  loadingPosts.value = true;
  try {
    const userInstance = new User();
    await userInstance.load(userId);
    const userPosts = await userInstance.loadHasMany('posts');
    posts.value = userPosts.map(post => post.toJSON());
  } catch (error) {
    console.error('Error loading posts:', error);
  } finally {
    loadingPosts.value = false;
  }
};

// Utility function
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

// SEO meta tags
useSeoMeta({
  title: () => user.value ? `${user.value.name} - User Profile` : 'User Profile',
  description: () => user.value ? `Profile page for ${user.value.name}` : 'User profile page',
});
</script>
```

### Components

```vue
<!-- components/UserForm.vue -->
<template>
  <form @submit.prevent="submitForm" class="bg-white p-6 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold mb-4">Add New User</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    
    <div class="mt-4">
      <label for="bio" class="block text-sm font-medium text-gray-700 mb-1">
        Bio
      </label>
      <textarea
        id="bio"
        v-model="form.bio"
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Tell us about yourself..."
      ></textarea>
    </div>
    
    <div class="mt-6">
      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Creating...' : 'Create User' }}
      </button>
    </div>
    
    <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ error }}
    </div>
  </form>
</template>

<script setup>
import { User } from '~/models/user.model';

const emit = defineEmits(['user-created']);

const form = reactive({
  name: '',
  email: '',
  bio: ''
});

const loading = ref(false);
const error = ref('');

const submitForm = async () => {
  if (loading.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const user = new User();
    user.name = form.name;
    user.email = form.email;
    user.bio = form.bio;
    user.createdAt = new Date().toISOString();
    
    await user.save();
    
    emit('user-created', user.toJSON());
    
    // Reset form
    form.name = '';
    form.email = '';
    form.bio = '';
    
  } catch (err) {
    error.value = err.message || 'Failed to create user';
  } finally {
    loading.value = false;
  }
};
</script>
```

```vue
<!-- components/UserCard.vue -->
<template>
  <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-gray-900">{{ user.name }}</h3>
        <p class="text-sm text-gray-600">{{ user.email }}</p>
        <p v-if="user.bio" class="text-sm text-gray-500 mt-2">{{ user.bio }}</p>
        <p class="text-xs text-gray-400 mt-2">
          Created: {{ formatDate(user.createdAt) }}
        </p>
      </div>
      
      <div class="flex-shrink-0 ml-4">
        <button
          @click="toggleMenu"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div v-if="showMenu" class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex space-x-2">
        <button
          @click="loadPosts"
          :disabled="loadingPosts"
          class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {{ loadingPosts ? 'Loading...' : 'Load Posts' }}
        </button>
        
        <button
          @click="editUser"
          class="text-sm text-gray-600 hover:text-gray-800"
        >
          Edit
        </button>
        
        <button
          @click="deleteUser"
          class="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
    
    <div v-if="posts.length > 0" class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-2">
        Posts ({{ posts.length }})
      </h4>
      <div class="space-y-1">
        <div
          v-for="post in posts"
          :key="post.id"
          class="text-xs text-gray-600 p-2 bg-gray-50 rounded"
        >
          {{ post.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { User } from '~/models/user.model';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['user-deleted']);

const showMenu = ref(false);
const posts = ref([]);
const loadingPosts = ref(false);

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const loadPosts = async () => {
  if (loadingPosts.value) return;
  
  loadingPosts.value = true;
  try {
    const user = new User();
    await user.load(props.user.id);
    const userPosts = await user.loadHasMany('posts');
    posts.value = userPosts.map(post => post.toJSON());
  } catch (error) {
    console.error('Error loading posts:', error);
  } finally {
    loadingPosts.value = false;
  }
};

const editUser = () => {
  // Navigate to edit page or open modal
  navigateTo(`/users/${props.user.id}/edit`);
};

const deleteUser = async () => {
  if (!confirm('Are you sure you want to delete this user?')) return;
  
  try {
    const user = new User();
    await user.load(props.user.id);
    await user.destroy();
    
    emit('user-deleted', props.user.id);
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Failed to delete user');
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};
</script>
```

## Composables

Create reusable composables for Firebase ORM operations:

```typescript
// composables/useFirebaseORM.ts
import type { Ref } from 'vue';

export function useFirebaseORM<T extends any>(
  ModelClass: new () => T,
  options: {
    realtime?: boolean;
    initialData?: T[];
  } = {}
) {
  const data: Ref<T[]> = ref(options.initialData || []);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Load all data
  const loadData = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const items = await (ModelClass as any).getAll();
      data.value = items;
      return items;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create item
  const createItem = async (itemData: Partial<T>) => {
    try {
      const item = new ModelClass();
      Object.assign(item, itemData);
      await (item as any).save();
      
      if (!options.realtime) {
        data.value.push(item);
      }
      
      return item;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create item';
      throw err;
    }
  };

  // Update item
  const updateItem = async (id: string, updates: Partial<T>) => {
    try {
      const item = new ModelClass();
      await (item as any).load(id);
      Object.assign(item, updates);
      await (item as any).save();
      
      if (!options.realtime) {
        const index = data.value.findIndex((d: any) => d.getId() === id);
        if (index >= 0) {
          data.value[index] = item;
        }
      }
      
      return item;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update item';
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    try {
      const item = new ModelClass();
      await (item as any).load(id);
      await (item as any).destroy();
      
      if (!options.realtime) {
        data.value = data.value.filter((d: any) => d.getId() !== id);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete item';
      throw err;
    }
  };

  // Set up real-time subscription
  onMounted(() => {
    if (options.realtime && process.client) {
      const unsubscribe = (ModelClass as any).onList((item: T) => {
        const index = data.value.findIndex((d: any) => d.getId() === (item as any).getId());
        if (index >= 0) {
          data.value[index] = item;
        } else {
          data.value.push(item);
        }
      });

      onUnmounted(() => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    }
  });

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    loadData,
    createItem,
    updateItem,
    deleteItem,
  };
}
```

### Using Composables

```vue
<!-- pages/users-with-composable.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Users (with Composable)</h1>
    
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="error" class="text-red-600">Error: {{ error }}</div>
    <div v-else>
      <UserForm @user-created="handleCreateUser" />
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <UserCard
          v-for="user in users"
          :key="user.getId()"
          :user="user.toJSON()"
          @user-deleted="handleDeleteUser"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { User } from '~/models/user.model';

const {
  data: users,
  loading,
  error,
  loadData,
  createItem,
  deleteItem
} = useFirebaseORM(User, { realtime: true });

// Load initial data
await loadData();

const handleCreateUser = async (userData) => {
  try {
    await createItem({
      ...userData,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to create user:', error);
  }
};

const handleDeleteUser = async (userId) => {
  try {
    await deleteItem(userId);
  } catch (error) {
    console.error('Failed to delete user:', error);
  }
};
</script>
```

## API Routes

### Nuxt 3 Server API

```typescript
// server/api/users/index.get.ts
import { User } from '~/models/user.model';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const limit = Number(query.limit) || 10;
    const offset = Number(query.offset) || 0;
    
    const users = await User.query()
      .limit(limit)
      .startAfter(offset)
      .get();
    
    return {
      users: users.map(user => user.toJSON()),
      pagination: { limit, offset }
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    });
  }
});
```

```typescript
// server/api/users/index.post.ts
import { User } from '~/models/user.model';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { name, email, bio } = body;
    
    if (!name || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name and email are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User with this email already exists'
      });
    }
    
    const user = new User();
    user.name = name;
    user.email = email;
    user.bio = bio;
    user.createdAt = new Date().toISOString();
    
    await user.save();
    
    return user.toJSON();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user'
    });
  }
});
```

```typescript
// server/api/users/[id].get.ts
import { User } from '~/models/user.model';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      });
    }
    
    const user = new User();
    await user.load(id);
    
    return user.toJSON();
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    });
  }
});
```

## Middleware

```typescript
// middleware/firebase-init.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // This middleware ensures Firebase is initialized before navigation
  if (process.client) {
    // Client-side Firebase should be initialized by the plugin
    // You can add additional client-side initialization logic here
  }
});
```

## Error Handling

```vue
<!-- error.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-900 mb-4">{{ error.statusCode }}</h1>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          {{ error.statusMessage || 'An error occurred' }}
        </h2>
        <p class="text-gray-600 mb-6">
          {{ getErrorDescription(error.statusCode) }}
        </p>
        <div class="space-y-3">
          <button
            @click="handleError"
            class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
          <button
            @click="goHome"
            class="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object
});

const getErrorDescription = (statusCode) => {
  switch (statusCode) {
    case 404:
      return 'The page you are looking for could not be found.';
    case 500:
      return 'Something went wrong on our servers.';
    default:
      return 'An unexpected error occurred.';
  }
};

const handleError = () => {
  clearError({ redirect: '/' });
};

const goHome = () => {
  navigateTo('/');
};
</script>
```

## Build and Deployment

### Static Generation

For static generation with Firebase ORM:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      routes: ['/users', '/about']
    }
  },
  
  // Generate dynamic routes
  hooks: {
    'nitro:config': async (nitroConfig) => {
      if (nitroConfig.prerender?.routes) {
        // Add dynamic user routes
        const users = await User.getAll();
        const userRoutes = users.map(user => `/users/${user.getId()}`);
        nitroConfig.prerender.routes.push(...userRoutes);
      }
    }
  }
});
```

### Environment-specific Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // Use different configurations per environment
  ...(process.env.NODE_ENV === 'development' && {
    ssr: true,
    // Development-specific settings
  }),
  
  ...(process.env.NODE_ENV === 'production' && {
    // Production optimizations
    experimental: {
      payloadExtraction: false
    }
  })
});
```

## Best Practices

### 1. Performance Optimization

```typescript
// Use lazy loading for heavy operations
const { pending, data: heavyData } = useLazyAsyncData('heavy-operation', async () => {
  return await performHeavyOperation();
});
```

### 2. Error Boundaries

```vue
<template>
  <div>
    <Suspense>
      <template #default>
        <UsersList />
      </template>
      <template #fallback>
        <div>Loading users...</div>
      </template>
    </Suspense>
  </div>
</template>
```

### 3. Type Safety

```typescript
// Define proper types for your data
interface UserData {
  id: string;
  name: string;
  email: string;
  bio?: string;
  createdAt: string;
}

const users: Ref<UserData[]> = ref([]);
```

## Common Issues

### 1. Server-Client Hydration Mismatch

Ensure data consistency between server and client:

```typescript
// Use proper data serialization
const { data } = await useLazyAsyncData('users', async () => {
  const users = await User.getAll();
  return users.map(user => user.toJSON()); // Ensure serializable data
});
```

### 2. Environment Variables

Use proper prefixes for environment variables in Nuxt 3.

### 3. Firebase Admin in Client Bundle

Ensure Firebase Admin SDK is not bundled for client-side.

## Next Steps

- Learn about [Vue.js Integration](./vue.md)
- Explore [Performance Optimization](../advanced/performance.md)
- Check [Real-time Features](../realtime.md)