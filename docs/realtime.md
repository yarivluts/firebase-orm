# Real-time Features

Firebase ORM provides powerful real-time capabilities that allow your applications to automatically sync with database changes. This guide covers how to implement real-time updates, handle different event types, and manage subscriptions effectively.

## Overview

Firebase ORM's real-time features are built on top of Firestore's real-time listeners, providing:
- Automatic UI updates when data changes
- Multiple event types (added, modified, removed)
- Efficient subscription management
- Type-safe listeners with full model support

## Basic Real-time Listening

### Listen to All Records

Listen to changes across all documents in a collection:

```typescript
import { User } from './models/User';

// Listen to all user changes
const unsubscribe = User.onList((user) => {
  console.log('User updated:', user.name);
  console.log('User ID:', user.getId());
});

// Stop listening when done
// unsubscribe();
```

### Listen to Specific Events

Handle different types of changes with event-specific listeners:

```typescript
// Listen only to newly added users
const unsubscribeAdded = User.onList((user) => {
  console.log('New user added:', user.name);
  // Update UI to show new user
}, 'added');

// Listen only to user modifications
const unsubscribeModified = User.onList((user) => {
  console.log('User modified:', user.name);
  // Update existing UI element
}, 'modified');

// Listen only to user deletions
const unsubscribeRemoved = User.onList((user) => {
  console.log('User removed:', user.getId());
  // Remove from UI
}, 'removed');
```

### Advanced Event Handling

Use the mode-based listener for complete control:

```typescript
const unsubscribe = User.onModeList({
  // Called for newly added users
  added: (user) => {
    console.log('User added:', user.name);
    addUserToUI(user);
  },
  
  // Called when user data is modified
  modified: (user) => {
    console.log('User modified:', user.name);
    updateUserInUI(user);
  },
  
  // Called when user is deleted
  removed: (user) => {
    console.log('User removed:', user.getId());
    removeUserFromUI(user);
  },
  
  // Called during initial load
  init: (user) => {
    console.log('Initial user loaded:', user.name);
    addUserToUIWithoutAnimation(user);
  }
});
```

## Single Document Listening

Listen to changes on a specific document:

```typescript
// Load a specific user
const user = new User();
await user.load('user-id-here');

// Listen to changes on this specific user
const unsubscribe = user.on(() => {
  console.log('User data changed:', user.name);
  console.log('Updated email:', user.email);
  
  // The user object is automatically updated
  updateUserProfileInUI(user);
});

// Stop listening
// unsubscribe();
```

## Framework Integration Examples

### React Integration

```typescript
// React hook for real-time data
import { useState, useEffect } from 'react';
import { User } from '../models/User';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    User.getAll().then(initialUsers => {
      setUsers(initialUsers);
      setLoading(false);
    });

    // Set up real-time listener
    const unsubscribe = User.onModeList({
      added: (user) => {
        setUsers(prev => [...prev, user]);
      },
      modified: (user) => {
        setUsers(prev => prev.map(u => 
          u.getId() === user.getId() ? user : u
        ));
      },
      removed: (user) => {
        setUsers(prev => prev.filter(u => 
          u.getId() !== user.getId()
        ));
      }
    });

    return () => unsubscribe();
  }, []);

  return { users, loading };
}

// Using the hook in a component
function UserList() {
  const { users, loading } = useUsers();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.getId()}>
          {user.name} - {user.email}
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div v-for="user in users" :key="user.getId()">
        {{ user.name }} - {{ user.email }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { User } from '../models/User';

const users = ref<User[]>([]);
const loading = ref(true);
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  // Initial load
  const initialUsers = await User.getAll();
  users.value = initialUsers;
  loading.value = false;

  // Set up real-time listener
  unsubscribe = User.onModeList({
    added: (user) => {
      users.value.push(user);
    },
    modified: (user) => {
      const index = users.value.findIndex(u => u.getId() === user.getId());
      if (index >= 0) {
        users.value[index] = user;
      }
    },
    removed: (user) => {
      users.value = users.value.filter(u => u.getId() !== user.getId());
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>
```

### Angular Integration

```typescript
// Angular service
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/User';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();
  private unsubscribe?: () => void;

  async initializeRealtime() {
    // Initial load
    const initialUsers = await User.getAll();
    this.usersSubject.next(initialUsers);

    // Set up real-time listener
    this.unsubscribe = User.onModeList({
      added: (user) => {
        const currentUsers = this.usersSubject.value;
        this.usersSubject.next([...currentUsers, user]);
      },
      modified: (user) => {
        const currentUsers = this.usersSubject.value;
        const updatedUsers = currentUsers.map(u => 
          u.getId() === user.getId() ? user : u
        );
        this.usersSubject.next(updatedUsers);
      },
      removed: (user) => {
        const currentUsers = this.usersSubject.value;
        const filteredUsers = currentUsers.filter(u => 
          u.getId() !== user.getId()
        );
        this.usersSubject.next(filteredUsers);
      }
    });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Angular component
import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-user-list',
  template: `
    <div *ngFor="let user of userService.users$ | async">
      {{ user.name }} - {{ user.email }}
    </div>
  `
})
export class UserListComponent implements OnInit, OnDestroy {
  constructor(public userService: UserService) {}

  async ngOnInit() {
    await this.userService.initializeRealtime();
  }

  ngOnDestroy() {
    this.userService.destroy();
  }
}
```

## Query-based Real-time Listening

Listen to real-time changes on filtered data:

```typescript
// Listen to only active users
const unsubscribe = User.query()
  .where('isActive', '==', true)
  .onSnapshot((users) => {
    console.log('Active users updated:', users.length);
    users.forEach(user => {
      console.log('Active user:', user.name);
    });
  });

// Listen to recent posts
const unsubscribeRecentPosts = Post.query()
  .where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .orderBy('createdAt', 'desc')
  .limit(10)
  .onSnapshot((posts) => {
    console.log('Recent posts updated:', posts.length);
    updateRecentPostsUI(posts);
  });
```

## Relationship-aware Real-time Updates

Handle real-time updates for related data:

```typescript
// User model with posts relationship
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
export class User extends BaseModel {
  @Field({ is_required: true })
  public name!: string;

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  // Method to set up real-time listening for user and their posts
  async setupRealtimeWithPosts() {
    // Listen to user changes
    const userUnsubscribe = this.on(() => {
      console.log('User updated:', this.name);
      updateUserUI(this);
    });

    // Listen to post changes for this user
    const postsUnsubscribe = Post.query()
      .where('author_id', '==', this.getId())
      .onSnapshot((posts) => {
        this.posts = posts;
        console.log(`${this.name} now has ${posts.length} posts`);
        updateUserPostsUI(this, posts);
      });

    // Return combined unsubscribe function
    return () => {
      userUnsubscribe();
      postsUnsubscribe();
    };
  }
}

// Usage
const user = new User();
await user.load('user-id');
const unsubscribe = await user.setupRealtimeWithPosts();

// Clean up when done
// unsubscribe();
```

## Advanced Real-time Patterns

### Debounced Updates

Prevent too many UI updates with debouncing:

```typescript
class RealtimeManager {
  private updateQueue = new Map<string, User>();
  private updateTimeout?: NodeJS.Timeout;

  setupDebouncedUserListener() {
    return User.onList((user) => {
      // Add to queue
      this.updateQueue.set(user.getId(), user);
      
      // Clear existing timeout
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
      
      // Set new timeout to batch updates
      this.updateTimeout = setTimeout(() => {
        this.processBatchedUpdates();
      }, 100); // 100ms debounce
    });
  }

  private processBatchedUpdates() {
    const users = Array.from(this.updateQueue.values());
    console.log(`Processing ${users.length} batched updates`);
    
    // Update UI with all changes at once
    updateUsersInUI(users);
    
    // Clear queue
    this.updateQueue.clear();
  }
}
```

### Connection State Management

Handle offline/online scenarios:

```typescript
class RealtimeService {
  private subscriptions: (() => void)[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Listen to connection changes
    window.addEventListener('online', () => {
      console.log('Back online - reconnecting...');
      this.isOnline = true;
      this.reconnectAll();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline - pausing updates');
      this.isOnline = false;
      this.pauseAll();
    });
  }

  addSubscription(setupFn: () => (() => void)) {
    if (this.isOnline) {
      const unsubscribe = setupFn();
      this.subscriptions.push(unsubscribe);
      return unsubscribe;
    } else {
      // Queue for when we're back online
      const unsubscribe = () => {};
      this.subscriptions.push(() => setupFn());
      return unsubscribe;
    }
  }

  private reconnectAll() {
    // Reconnect all subscriptions
    this.subscriptions.forEach(setupFn => {
      setupFn();
    });
  }

  private pauseAll() {
    // Pause all subscriptions
    this.subscriptions.forEach(unsubscribe => {
      unsubscribe();
    });
  }
}
```

### Memory Management

Prevent memory leaks with proper subscription management:

```typescript
class SubscriptionManager {
  private subscriptions = new Set<() => void>();

  add(unsubscribe: () => void) {
    this.subscriptions.add(unsubscribe);
    return unsubscribe;
  }

  remove(unsubscribe: () => void) {
    this.subscriptions.delete(unsubscribe);
  }

  clear() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}

// Usage in a component
class UserComponent {
  private subscriptions = new SubscriptionManager();

  async initialize() {
    // Add subscriptions to manager
    const userSub = this.subscriptions.add(
      User.onList(user => this.handleUserUpdate(user))
    );

    const postSub = this.subscriptions.add(
      Post.onList(post => this.handlePostUpdate(post))
    );
  }

  destroy() {
    // Clean up all subscriptions
    this.subscriptions.clear();
  }
}
```

## Performance Optimization

### Limiting Real-time Data

Only subscribe to data you actually need:

```typescript
// Only listen to recent posts instead of all posts
const unsubscribe = Post.query()
  .where('createdAt', '>', getLastWeek())
  .limit(50)
  .onSnapshot((posts) => {
    updateRecentPosts(posts);
  });

// Only listen to active users
const activeUsersUnsub = User.query()
  .where('isActive', '==', true)
  .onSnapshot((users) => {
    updateActiveUsersList(users);
  });
```

### Conditional Subscriptions

Only set up real-time listening when needed:

```typescript
class ConditionalRealtimeService {
  private activeSubscriptions = new Map<string, () => void>();

  startListening(key: string, condition: boolean) {
    if (condition && !this.activeSubscriptions.has(key)) {
      const unsubscribe = this.setupSubscription(key);
      this.activeSubscriptions.set(key, unsubscribe);
    } else if (!condition && this.activeSubscriptions.has(key)) {
      this.stopListening(key);
    }
  }

  stopListening(key: string) {
    const unsubscribe = this.activeSubscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.activeSubscriptions.delete(key);
    }
  }

  private setupSubscription(key: string): () => void {
    switch (key) {
      case 'users':
        return User.onList(user => this.handleUserUpdate(user));
      case 'posts':
        return Post.onList(post => this.handlePostUpdate(post));
      default:
        return () => {};
    }
  }
}

// Usage based on user interaction
const service = new ConditionalRealtimeService();

// Start listening when user opens users page
service.startListening('users', userIsOnUsersPage);

// Stop listening when user navigates away
service.startListening('users', false);
```

## Error Handling

Handle real-time listener errors gracefully:

```typescript
function setupRealtimeWithErrorHandling() {
  const unsubscribe = User.onList(
    (user) => {
      try {
        updateUserInUI(user);
      } catch (error) {
        console.error('Error updating UI for user:', error);
        // Handle UI update error gracefully
      }
    },
    'modified'
  );

  // Wrap unsubscribe to handle errors
  return () => {
    try {
      unsubscribe();
    } catch (error) {
      console.error('Error unsubscribing from real-time listener:', error);
    }
  };
}

// Enhanced error handling with retry
class RobustRealtimeService {
  private maxRetries = 3;
  private retryDelay = 1000;

  async setupWithRetry(setupFn: () => (() => void), retries = 0): Promise<() => void> {
    try {
      return setupFn();
    } catch (error) {
      console.error(`Real-time setup failed (attempt ${retries + 1}):`, error);
      
      if (retries < this.maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, retries))
        );
        return this.setupWithRetry(setupFn, retries + 1);
      } else {
        throw new Error('Real-time setup failed after maximum retries');
      }
    }
  }
}
```

## Best Practices

### 1. Always Clean Up Subscriptions

```typescript
// In React
useEffect(() => {
  const unsubscribe = User.onList(handleUserUpdate);
  return () => unsubscribe(); // Cleanup on unmount
}, []);

// In Vue
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// In Angular
ngOnDestroy() {
  if (this.unsubscribe) {
    this.unsubscribe();
  }
}
```

### 2. Use Specific Event Types

```typescript
// Better: Only listen to the events you care about
const unsubscribe = User.onList(handleNewUser, 'added');

// Instead of: Listening to all events and filtering
const unsubscribe = User.onList((user) => {
  // Determine event type and handle accordingly
}, 'all');
```

### 3. Optimize Query Listeners

```typescript
// Good: Specific, limited query
Post.query()
  .where('isPublished', '==', true)
  .orderBy('publishedAt', 'desc')
  .limit(20)
  .onSnapshot(handlePosts);

// Avoid: Listening to all documents
Post.onList(handleAllPosts); // Could be too much data
```

### 4. Handle Offline Scenarios

```typescript
// Check online status before setting up listeners
if (navigator.onLine) {
  setupRealtimeListeners();
} else {
  // Load from cache or show offline message
  loadCachedData();
}
```

## Common Patterns

### Real-time Dashboard

```typescript
class RealtimeDashboard {
  private subscriptions: (() => void)[] = [];

  async initialize() {
    // Real-time user count
    this.subscriptions.push(
      User.onModeList({
        added: () => this.updateUserCount(),
        removed: () => this.updateUserCount()
      })
    );

    // Real-time active sessions
    this.subscriptions.push(
      Session.query()
        .where('isActive', '==', true)
        .onSnapshot((sessions) => {
          this.updateActiveSessionsDisplay(sessions);
        })
    );

    // Real-time revenue tracking
    this.subscriptions.push(
      Order.query()
        .where('status', '==', 'completed')
        .where('createdAt', '>', getTodayStart())
        .onSnapshot((orders) => {
          this.updateRevenueDisplay(orders);
        })
    );
  }

  destroy() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }
}
```

### Chat Application

```typescript
class RealtimeChat {
  private messageSubscription?: () => void;

  async joinChannel(channelId: string) {
    // Leave previous channel
    this.leaveChannel();

    // Join new channel
    this.messageSubscription = Message.query()
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot((messages) => {
        this.displayMessages(messages.reverse());
      });
  }

  leaveChannel() {
    if (this.messageSubscription) {
      this.messageSubscription();
      this.messageSubscription = undefined;
    }
  }

  async sendMessage(text: string, channelId: string) {
    const message = new Message();
    message.text = text;
    message.channelId = channelId;
    message.authorId = getCurrentUserId();
    message.createdAt = new Date().toISOString();
    
    await message.save();
    // Real-time listener will automatically update UI
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: Real-time listeners stop working
**Solution**: Check internet connection and re-establish listeners if needed

**Issue**: Too many re-renders in React
**Solution**: Use `useCallback` and `useMemo` to prevent unnecessary listener recreation

**Issue**: Memory leaks
**Solution**: Always call unsubscribe functions in cleanup/unmount handlers

**Issue**: Listeners not triggering
**Solution**: Verify Firestore security rules allow read access for the user

### Debugging Real-time Issues

```typescript
// Add logging to understand what's happening
const unsubscribe = User.onModeList({
  added: (user) => {
    console.log('🟢 User added:', user.getId(), user.name);
  },
  modified: (user) => {
    console.log('🟡 User modified:', user.getId(), user.name);
  },
  removed: (user) => {
    console.log('🔴 User removed:', user.getId());
  },
  init: (user) => {
    console.log('🔵 Initial user loaded:', user.getId(), user.name);
  }
});
```

## Next Steps

- Learn about [Performance Optimization](./advanced/performance.md) for large-scale real-time applications
- Explore [Security Best Practices](./advanced/security.md) for real-time data access
- Check out framework-specific real-time patterns in the [Framework Integration](./frameworks/) guides