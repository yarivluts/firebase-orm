# Vue.js Integration

This guide shows how to integrate Firebase ORM with Vue.js applications, covering Vue 3 Composition API, Options API, and integration with Pinia for state management.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase moment --save
```

For Vue 3 with TypeScript:
```bash
npm install --save-dev @types/node
```

### 2. TypeScript Configuration

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. Vite Configuration

For Vite projects, update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['firebase/firestore', 'firebase/app'],
  },
});
```

### 4. Environment Configuration

Create a `.env` file:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## Firebase Setup

### Firebase Configuration

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Firebase ORM
FirestoreOrmRepository.initGlobalConnection(firestore);

export { firestore, app };
```

### Vue Plugin

```typescript
// src/plugins/firebase.ts
import { App } from 'vue';
import { firestore } from '../config/firebase';

export default {
  install(app: App) {
    app.config.globalProperties.$firestore = firestore;
    app.provide('firestore', firestore);
  },
};
```

### Initialize in Main

```typescript
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import firebasePlugin from './plugins/firebase';
import './config/firebase'; // Initialize Firebase ORM

import './style.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/users' },
    { path: '/users', component: () => import('./views/UserList.vue') },
    { path: '/users/:id', component: () => import('./views/UserDetail.vue') },
    { path: '/create', component: () => import('./views/CreateUser.vue') },
  ],
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(firebasePlugin);

app.mount('#app');
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

  // Vue-specific helper methods
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

## Composables

### useFirebaseORM Composable

```typescript
// src/composables/useFirebaseORM.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useFirebaseORM<T extends any>(
  ModelClass: new () => T,
  options: {
    realtime?: boolean;
    autoLoad?: boolean;
  } = {}
) {
  const data: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  // Load data
  const loadData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const items = await (ModelClass as any).getAll();
      data.value = items;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading.value = false;
    }
  };

  // Create item
  const createItem = async (itemData: Partial<T>) => {
    try {
      const item = new ModelClass();
      item.initFromData(itemData);
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
      item.initFromData(updates);
      await (item as any).save();

      if (!options.realtime) {
        const index = data.value.findIndex(d => (d as any).getId() === id);
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
        data.value = data.value.filter(d => (d as any).getId() !== id);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete item';
      throw err;
    }
  };

  // Set up real-time subscription
  const setupRealtime = () => {
    if (options.realtime) {
      unsubscribe = (ModelClass as any).onList((item: T) => {
        const index = data.value.findIndex(d => (d as any).getId() === (item as any).getId());
        if (index >= 0) {
          data.value[index] = item;
        } else {
          data.value.push(item);
        }
      });
    }
  };

  onMounted(() => {
    if (options.autoLoad !== false) {
      loadData();
    }
    setupRealtime();
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
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

### useUser Composable

```typescript
// src/composables/useUser.ts
import { ref, watch, type Ref } from 'vue';
import { User } from '../models/User';

export function useUser(userId: Ref<string | undefined>) {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadUser = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const userInstance = new User();
      await userInstance.load(id);
      user.value = userInstance;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load user';
      user.value = null;
    } finally {
      loading.value = false;
    }
  };

  const loadUserPosts = async () => {
    if (!user.value) return [];

    try {
      const posts = await user.value.loadHasMany('posts');
      // Update user with loaded posts
      if (user.value) {
        user.value.posts = posts;
      }
      return posts;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load user posts';
      return [];
    }
  };

  // Watch for userId changes
  watch(userId, (newId) => {
    if (newId) {
      loadUser(newId);
    } else {
      user.value = null;
    }
  }, { immediate: true });

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    loadUser,
    loadUserPosts,
  };
}
```

## Pinia Store

```typescript
// src/stores/userStore.ts
import { defineStore } from 'pinia';
import { User } from '../models/User';

interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    users: [],
    selectedUser: null,
    loading: false,
    error: null,
  }),

  getters: {
    getUserById: (state) => {
      return (id: string) => state.users.find(user => user.getId() === id);
    },
    userCount: (state) => state.users.length,
    hasError: (state) => !!state.error,
  },

  actions: {
    // Load all users
    async loadUsers() {
      this.loading = true;
      this.error = null;

      try {
        const users = await User.getAll();
        this.users = users;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load users';
      } finally {
        this.loading = false;
      }
    },

    // Create user
    async createUser(userData: Partial<User>) {
      try {
        const user = new User();
        user.initFromData(userData);
        user.createdAt = new Date().toISOString();
        await user.save();

        this.users.push(user);
        return user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create user';
        throw error;
      }
    },

    // Update user
    async updateUser(id: string, updates: Partial<User>) {
      try {
        const user = new User();
        await user.load(id);
        user.initFromData(updates);
        await user.save();

        const index = this.users.findIndex(u => u.getId() === id);
        if (index >= 0) {
          this.users[index] = user;
        }

        if (this.selectedUser?.getId() === id) {
          this.selectedUser = user;
        }

        return user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update user';
        throw error;
      }
    },

    // Delete user
    async deleteUser(id: string) {
      try {
        const user = new User();
        await user.load(id);
        await user.destroy();

        this.users = this.users.filter(u => u.getId() !== id);

        if (this.selectedUser?.getId() === id) {
          this.selectedUser = null;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete user';
        throw error;
      }
    },

    // Load single user
    async loadUser(id: string) {
      try {
        const user = new User();
        await user.load(id);
        this.selectedUser = user;
        return user;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load user';
        throw error;
      }
    },

    // Clear error
    clearError() {
      this.error = null;
    },

    // Set selected user
    setSelectedUser(user: User | null) {
      this.selectedUser = user;
    },

    // Set up real-time subscription
    setupRealtime() {
      return User.onList((user: User) => {
        const index = this.users.findIndex(u => u.getId() === user.getId());
        if (index >= 0) {
          this.users[index] = user;
        } else {
          this.users.push(user);
        }

        if (this.selectedUser?.getId() === user.getId()) {
          this.selectedUser = user;
        }
      });
    },
  },
});
```

## Vue Components

### User List View (Composition API)

```vue
<!-- src/views/UserList.vue -->
<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-gray-900">Users</h1>
      <router-link
        to="/create"
        class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Add User
      </router-link>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
        <div class="ml-auto pl-3">
          <button
            @click="clearError"
            class="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && users.length === 0" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="users.length === 0" class="text-center py-12">
      <p class="text-gray-500 text-lg">No users found</p>
      <router-link
        to="/create"
        class="text-blue-500 hover:text-blue-600 mt-2 inline-block"
      >
        Create your first user
      </router-link>
    </div>

    <!-- Users Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UserCard
        v-for="user in users"
        :key="user.getId()"
        :user="user"
        @delete="handleDeleteUser"
      />
    </div>

    <!-- Loading Indicator for Additional Data -->
    <div v-if="loading && users.length > 0" class="text-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { storeToRefs } from 'pinia';
import UserCard from '../components/UserCard.vue';

const userStore = useUserStore();
const { users, loading, error } = storeToRefs(userStore);

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  await userStore.loadUsers();
  unsubscribe = userStore.setupRealtime();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

const handleDeleteUser = async (userId: string) => {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await userStore.deleteUser(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }
};

const clearError = () => {
  userStore.clearError();
};
</script>
```

### User Card Component

```vue
<!-- src/components/UserCard.vue -->
<template>
  <div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
    <div class="p-6">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <!-- Avatar -->
          <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <img
              v-if="user.avatar"
              :src="user.avatar"
              :alt="user.name"
              class="w-12 h-12 rounded-full object-cover"
            />
            <span v-else class="text-gray-600 font-medium">
              {{ user.getInitials() }}
            </span>
          </div>
          
          <!-- User Info -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ user.getDisplayName() }}
            </h3>
            <p class="text-sm text-gray-600">{{ user.email }}</p>
          </div>
        </div>

        <!-- Menu -->
        <div class="relative">
          <button
            @click="isMenuOpen = !isMenuOpen"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="isMenuOpen"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
          >
            <div class="py-1">
              <router-link
                :to="`/users/${user.getId()}`"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="isMenuOpen = false"
              >
                View Details
              </router-link>
              <button
                @click="loadPosts"
                :disabled="loadingPosts"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {{ loadingPosts ? 'Loading Posts...' : 'Load Posts' }}
              </button>
              <button
                @click="deleteUser"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bio -->
      <p v-if="user.bio" class="mt-3 text-sm text-gray-600">{{ user.bio }}</p>

      <!-- Created Date -->
      <div class="mt-4 text-xs text-gray-500">
        Created: {{ formatDate(user.createdAt) }}
      </div>

      <!-- Posts -->
      <div v-if="posts.length > 0" class="mt-4 pt-4 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-900 mb-2">
          Posts ({{ posts.length }})
        </h4>
        <div class="space-y-1">
          <div
            v-for="(post, index) in posts.slice(0, 3)"
            :key="index"
            class="text-xs text-gray-600 p-2 bg-gray-50 rounded"
          >
            {{ post.title }}
          </div>
          <div v-if="posts.length > 3" class="text-xs text-gray-500">
            +{{ posts.length - 3 }} more posts
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { User } from '../models/User';

interface Props {
  user: User;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  delete: [userId: string];
}>();

const isMenuOpen = ref(false);
const posts = ref<any[]>([]);
const loadingPosts = ref(false);

const loadPosts = async () => {
  if (loadingPosts.value) return;

  loadingPosts.value = true;
  try {
    const userPosts = await props.user.loadHasMany('posts');
    posts.value = userPosts;
  } catch (error) {
    console.error('Error loading posts:', error);
  } finally {
    loadingPosts.value = false;
    isMenuOpen.value = false;
  }
};

const deleteUser = () => {
  emit('delete', props.user.getId());
  isMenuOpen.value = false;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};
</script>
```

### User Detail View

```vue
<!-- src/views/UserDetail.vue -->
<template>
  <div class="max-w-4xl mx-auto">
    <!-- Back Button -->
    <div class="mb-6">
      <router-link
        to="/users"
        class="text-blue-500 hover:text-blue-600 flex items-center"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Users
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <!-- User Not Found -->
    <div v-else-if="!user" class="text-center py-12">
      <p class="text-gray-500 text-lg">User not found</p>
      <router-link
        to="/users"
        class="text-blue-500 hover:text-blue-600 mt-2 inline-block"
      >
        Back to Users
      </router-link>
    </div>

    <!-- User Details -->
    <div v-else class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="p-8">
        <!-- User Header -->
        <div class="flex items-center space-x-6 mb-6">
          <div class="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
            <img
              v-if="user.avatar"
              :src="user.avatar"
              :alt="user.name"
              class="w-24 h-24 rounded-full object-cover"
            />
            <span v-else class="text-gray-600 font-medium text-2xl">
              {{ user.getInitials() }}
            </span>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ user.getDisplayName() }}
            </h1>
            <p class="text-lg text-gray-600">{{ user.email }}</p>
            <p class="text-sm text-gray-500 mt-1">
              Member since {{ formatDate(user.createdAt) }}
            </p>
          </div>
        </div>

        <!-- Bio Section -->
        <div v-if="user.bio" class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Bio</h2>
          <p class="text-gray-700">{{ user.bio }}</p>
        </div>

        <!-- Posts Section -->
        <div class="border-t pt-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Posts</h2>
            <button
              @click="loadUserPosts"
              :disabled="loadingPosts"
              class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {{ loadingPosts ? 'Loading...' : 'Load Posts' }}
            </button>
          </div>

          <!-- Posts Loading -->
          <div v-if="loadingPosts" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>

          <!-- Posts List -->
          <div v-else-if="user.posts && user.posts.length > 0" class="grid gap-4">
            <div
              v-for="(post, index) in user.posts"
              :key="index"
              class="p-4 border border-gray-200 rounded-md"
            >
              <h3 class="font-medium text-gray-900">{{ post.title }}</h3>
              <p class="text-gray-600 text-sm mt-1">{{ post.content }}</p>
              <p class="text-gray-400 text-xs mt-2">
                {{ formatDate(post.createdAt) }}
              </p>
            </div>
          </div>

          <!-- No Posts -->
          <div v-else-if="user.posts" class="text-center py-8">
            <p class="text-gray-500">No posts found</p>
          </div>

          <!-- Posts Not Loaded -->
          <div v-else class="text-center py-8">
            <p class="text-gray-500">Click "Load Posts" to view user posts</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUser } from '../composables/useUser';

const route = useRoute();
const userId = computed(() => route.params.id as string);

const { user, loading, error, loadUserPosts } = useUser(userId);
const loadingPosts = ref(false);

const handleLoadPosts = async () => {
  loadingPosts.value = true;
  try {
    await loadUserPosts();
  } catch (error) {
    console.error('Failed to load posts:', error);
  } finally {
    loadingPosts.value = false;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};
</script>
```

### Create User Form

```vue
<!-- src/views/CreateUser.vue -->
<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Create New User</h1>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
        <div class="ml-auto pl-3">
          <button
            @click="error = null"
            class="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="submitForm" class="bg-white shadow-lg rounded-lg p-8">
      <div class="space-y-6">
        <!-- Name Field -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter full name"
          />
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email address"
          />
        </div>

        <!-- Avatar Field -->
        <div>
          <label for="avatar" class="block text-sm font-medium text-gray-700 mb-1">
            Avatar URL
          </label>
          <input
            id="avatar"
            v-model="formData.avatar"
            type="url"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <!-- Bio Field -->
        <div>
          <label for="bio" class="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            v-model="formData.bio"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end space-x-4 mt-8">
        <router-link
          to="/users"
          class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </router-link>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? 'Creating...' : 'Create User' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';

const router = useRouter();
const userStore = useUserStore();

const formData = reactive({
  name: '',
  email: '',
  bio: '',
  avatar: ''
});

const loading = ref(false);
const error = ref<string | null>(null);

const submitForm = async () => {
  error.value = null;

  if (!formData.name.trim() || !formData.email.trim()) {
    error.value = 'Name and email are required';
    return;
  }

  loading.value = true;

  try {
    await userStore.createUser(formData);
    router.push('/users');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create user';
  } finally {
    loading.value = false;
  }
};
</script>
```

## Options API Alternative

For developers who prefer the Options API:

```vue
<!-- src/components/UserListOptions.vue -->
<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-gray-900">Users (Options API)</h1>
      <router-link
        to="/create"
        class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Add User
      </router-link>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UserCard
        v-for="user in users"
        :key="user.getId()"
        :user="user"
        @delete="handleDeleteUser"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { User } from '../models/User';
import UserCard from './UserCard.vue';

export default defineComponent({
  name: 'UserListOptions',
  components: {
    UserCard,
  },
  data() {
    return {
      users: [] as User[],
      loading: false,
      error: null as string | null,
      unsubscribe: null as (() => void) | null,
    };
  },
  async mounted() {
    await this.loadUsers();
    this.setupRealtime();
  },
  unmounted() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      this.error = null;

      try {
        this.users = await User.getAll();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load users';
      } finally {
        this.loading = false;
      }
    },
    async handleDeleteUser(userId: string) {
      if (confirm('Are you sure you want to delete this user?')) {
        try {
          const user = new User();
          await user.load(userId);
          await user.destroy();
          // Real-time listener will update the UI
        } catch (error) {
          console.error('Failed to delete user:', error);
        }
      }
    },
    setupRealtime() {
      this.unsubscribe = User.onList((user: User) => {
        const index = this.users.findIndex(u => u.getId() === user.getId());
        if (index >= 0) {
          this.users[index] = user;
        } else {
          this.users.push(user);
        }
      });
    },
  },
});
</script>
```

## Testing

### Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```typescript
// src/test/setup.ts
import { vi } from 'vitest';

// Mock Firebase
vi.mock('../config/firebase', () => ({
  firestore: {},
  app: {},
}));

// Mock Firebase ORM
vi.mock('@arbel/firebase-orm', () => ({
  FirestoreOrmRepository: {
    initGlobalConnection: vi.fn(),
  },
  BaseModel: class MockBaseModel {
    save = vi.fn();
    load = vi.fn();
    destroy = vi.fn();
    getId = vi.fn(() => 'mock-id');
    static getAll = vi.fn(() => Promise.resolve([]));
    static query = vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => Promise.resolve([])),
    }));
    static onList = vi.fn(() => vi.fn());
  },
  Model: () => (target: any) => target,
  Field: () => (target: any, propertyKey: string) => {},
  HasMany: () => (target: any, propertyKey: string) => {},
}));
```

### Component Tests

```typescript
// src/components/__tests__/UserCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from '../UserCard.vue';
import { User } from '../../models/User';

// Mock user
const mockUser = {
  getId: () => 'test-id',
  name: 'John Doe',
  email: 'john@example.com',
  getDisplayName: () => 'John Doe',
  getInitials: () => 'JD',
  loadHasMany: vi.fn(() => Promise.resolve([])),
} as unknown as User;

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('john@example.com');
    expect(wrapper.text()).toContain('JD');
  });

  it('emits delete event when delete button is clicked', async () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    // Open menu
    await wrapper.find('button').trigger('click');
    
    // Click delete
    await wrapper.find('button:last-child').trigger('click');

    expect(wrapper.emitted().delete).toBeTruthy();
    expect(wrapper.emitted().delete[0]).toEqual(['test-id']);
  });
});
```

## Best Practices

### 1. Performance Optimization

```vue
<!-- Use v-memo for expensive rendering -->
<div
  v-for="user in users"
  :key="user.getId()"
  v-memo="[user.getId(), user.name, user.email]"
>
  <!-- User content -->
</div>

<!-- Use computed properties for expensive calculations -->
<script setup>
const expensiveValue = computed(() => {
  return users.value.filter(user => user.isActive).length;
});
</script>
```

### 2. Error Handling

```typescript
// Global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err);
  console.error('Component info:', info);
};
```

### 3. TypeScript Integration

```typescript
// Define proper types
interface UserFormData {
  name: string;
  email: string;
  bio: string;
  avatar: string;
}

const formData = reactive<UserFormData>({
  name: '',
  email: '',
  bio: '',
  avatar: ''
});
```

## Common Issues

### 1. Reactivity with Firebase ORM Models

Ensure proper reactivity when working with Firebase ORM models:

```typescript
// Use reactive/ref for model instances
const user = ref<User | null>(null);

// Update reactively
const updateUser = (newUser: User) => {
  user.value = newUser;
};
```

### 2. Real-time Subscription Cleanup

Always clean up subscriptions in `onUnmounted`:

```typescript
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
```

### 3. TypeScript Decorators

Ensure proper TypeScript configuration for decorator support.

## Next Steps

- Learn about [Node.js Integration](./nodejs.md)
- Explore [Real-time Features](../realtime.md)
- Check [Performance Optimization](../advanced/performance.md)