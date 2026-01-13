# Angular Integration

This guide shows how to integrate Firebase ORM with Angular applications, covering both standalone components and traditional NgModule-based applications.

## Quick Setup

### 1. Installation

```bash
npm install @arbel/firebase-orm firebase rxfire moment --save
```

### 2. Angular Configuration

Add to your `angular.json` build options:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "allowedCommonJsDependencies": [
              "@arbel/firebase-orm",
              "moment"
            ]
          }
        }
      }
    }
  }
}
```

### 3. TypeScript Configuration

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

## Firebase Setup Service

Create a Firebase service to initialize the connection:

```typescript
// src/app/services/firebase.service.ts
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirestoreOrmRepository } from '@arbel/firebase-orm';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private firestore: Firestore;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    this.app = initializeApp(environment.firebase);
    this.firestore = getFirestore(this.app);
    
    // Initialize Firebase ORM
    FirestoreOrmRepository.initGlobalConnection(this.firestore);
  }

  getFirestore(): Firestore {
    return this.firestore;
  }
}
```

## Environment Configuration

Add Firebase config to your environment files:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  }
};
```

## Model Definition

Create your models in a dedicated folder:

```typescript
// src/app/models/user.model.ts
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

  @HasMany({ model: Post, foreignKey: 'author_id' })
  public posts?: Post[];

  // Angular-specific helper method
  getDisplayName(): string {
    return this.name || this.email;
  }
}
```

## Data Services

Create Angular services to encapsulate data operations:

```typescript
// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {}

  // Get all users
  getUsers(): Observable<User[]> {
    return from(User.getAll()).pipe(
      map(users => {
        this.usersSubject.next(users);
        return users;
      }),
      catchError(error => {
        console.error('Error fetching users:', error);
        throw error;
      })
    );
  }

  // Get user by ID
  getUser(id: string): Observable<User> {
    return from(this.loadUser(id));
  }

  private async loadUser(id: string): Promise<User> {
    const user = await User.init(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Create new user
  createUser(userData: Partial<User>): Observable<User> {
    return from(this.saveUser(userData));
  }

  private async saveUser(userData: Partial<User>): Promise<User> {
    const user = new User();
    user.initFromData(userData);
    user.createdAt = new Date().toISOString();
    await user.save();
    return user;
  }

  // Update user
  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return from(this.updateUserAsync(id, updates));
  }

  private async updateUserAsync(id: string, updates: Partial<User>): Promise<User> {
    const user = await User.init(id);
    if (!user) {
      throw new Error('User not found');
    }
    user.initFromData(updates);
    await user.save();
    return user;
  }

  // Delete user
  deleteUser(id: string): Observable<void> {
    return from(this.deleteUserAsync(id));
  }

  private async deleteUserAsync(id: string): Promise<void> {
    const user = await User.init(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.destroy();
  }

  // Real-time subscription
  subscribeToUsers(): () => void {
    return User.onList((user: User) => {
      const currentUsers = this.usersSubject.value;
      const index = currentUsers.findIndex(u => u.getId() === user.getId());
      
      if (index >= 0) {
        currentUsers[index] = user;
      } else {
        currentUsers.push(user);
      }
      
      this.usersSubject.next([...currentUsers]);
    });
  }
}
```

## Component Implementation

### Standalone Component (Angular 14+)

```typescript
// src/app/components/user-list/user-list.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
{% raw %}
    <div class="user-list-container">
      <h2>Users</h2>
      
      <!-- Add User Form -->
      <form [formGroup]="userForm" (ngSubmit)="addUser()" class="add-user-form">
        <input formControlName="name" placeholder="Name" required>
        <input formControlName="email" type="email" placeholder="Email" required>
        <button type="submit" [disabled]="userForm.invalid">Add User</button>
      </form>

      <!-- Users List -->
      <div class="users-grid">
        <div *ngFor="let user of users$ | async; trackBy: trackByUserId" 
             class="user-card">
          <h3>{{ user.getDisplayName() }}</h3>
          <p>Email: {{ user.email }}</p>
          <p>Created: {{ user.createdAt | date }}</p>
          
          <div class="user-actions">
            <button (click)="editUser(user)">Edit</button>
            <button (click)="deleteUser(user.getId())" class="danger">Delete</button>
            <button (click)="loadUserPosts(user)">Load Posts</button>
          </div>

          <!-- Show posts if loaded -->
          <div *ngIf="user.posts" class="user-posts">
            <h4>Posts ({{ user.posts.length }})</h4>
            <div *ngFor="let post of user.posts" class="post-item">
              {{ post.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
{% endraw %}
  `,
  styles: [`
    .user-list-container { padding: 20px; }
    .add-user-form { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 20px; 
    }
    .add-user-form input { 
      padding: 8px; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
    }
    .users-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
      gap: 20px; 
    }
    .user-card { 
      border: 1px solid #ddd; 
      padding: 15px; 
      border-radius: 8px; 
    }
    .user-actions { 
      display: flex; 
      gap: 5px; 
      margin-top: 10px; 
    }
    .user-actions button { 
      padding: 5px 10px; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
    }
    .danger { background-color: #ff6b6b; color: white; }
    .user-posts { 
      margin-top: 10px; 
      padding-top: 10px; 
      border-top: 1px solid #eee; 
    }
    .post-item { 
      padding: 5px; 
      background: #f5f5f5; 
      margin: 2px 0; 
      border-radius: 3px; 
    }
  `]
})
export class UserListComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  
  users$!: Observable<User[]>;
  userForm!: FormGroup;
  private subscription?: Subscription;
  private unsubscribe?: () => void;

  ngOnInit() {
    this.initializeForm();
    this.loadUsers();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private initializeForm() {
    this.userForm = this.fb.group({
      name: [''],
      email: ['']
    });
  }

  private loadUsers() {
    this.users$ = this.userService.users$;
    this.userService.getUsers().subscribe();
  }

  private setupRealtimeSubscription() {
    this.unsubscribe = this.userService.subscribeToUsers();
  }

  addUser() {
    if (this.userForm.valid) {
      const userData = this.userForm.value;
      this.userService.createUser(userData).subscribe({
        next: (user) => {
          console.log('User created:', user);
          this.userForm.reset();
        },
        error: (error) => {
          console.error('Error creating user:', error);
        }
      });
    }
  }

  editUser(user: User) {
    const newName = prompt('Enter new name:', user.name);
    if (newName && newName !== user.name) {
      this.userService.updateUser(user.getId(), { name: newName }).subscribe({
        next: (updatedUser) => {
          console.log('User updated:', updatedUser);
        },
        error: (error) => {
          console.error('Error updating user:', error);
        }
      });
    }
  }

  deleteUser(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          console.log('User deleted');
        },
        error: (error) => {
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  async loadUserPosts(user: User) {
    try {
      user.posts = await user.loadHasMany('posts');
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  }

  trackByUserId(index: number, user: User): string {
    return user.getId();
  }
}
```

## App Bootstrap

### Standalone Bootstrap (Angular 14+)

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { FirebaseService } from './app/services/firebase.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    FirebaseService, // Ensure Firebase is initialized
    // ... other providers
  ]
}).catch(err => console.error(err));
```

### Traditional NgModule Bootstrap

```typescript
// src/app/app.module.ts
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { FirebaseService } from './services/firebase.service';
import { UserService } from './services/user.service';

export function initializeApp(firebaseService: FirebaseService) {
  return () => Promise.resolve(); // Firebase is initialized in constructor
}

@NgModule({
  declarations: [
    AppComponent,
    // ... other components
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    // ... other modules
  ],
  providers: [
    FirebaseService,
    UserService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FirebaseService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## Error Handling

Create an error handling service:

```typescript
// src/app/services/error-handling.service.ts
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr'; // Optional: for toast notifications

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  constructor(private toastr?: ToastrService) {}

  handleError(error: any, context: string = '') {
    console.error(`Error in ${context}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error?.message) {
      if (error.message.includes('permission-denied')) {
        message = 'You do not have permission to perform this action';
      } else if (error.message.includes('not-found')) {
        message = 'The requested resource was not found';
      } else if (error.message.includes('network-request-failed')) {
        message = 'Network error. Please check your connection';
      }
    }

    // Show toast notification if available
    if (this.toastr) {
      this.toastr.error(message, 'Error');
    } else {
      alert(message);
    }
  }
}
```

## Testing

### Unit Testing with Jasmine/Karma

```typescript
// src/app/services/user.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { FirebaseService } from './firebase.service';

describe('UserService', () => {
  let service: UserService;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('FirebaseService', ['getFirestore']);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: FirebaseService, useValue: spy }
      ]
    });
    
    service = TestBed.inject(UserService);
    firebaseServiceSpy = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Add more tests for your service methods
});
```

## Best Practices

### 1. Lazy Loading with Models

```typescript
// src/app/features/users/users.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', loadComponent: () => import('./user-list.component').then(m => m.UserListComponent) }
    ])
  ]
})
export class UsersModule { }
```

### 2. State Management Integration

```typescript
// With NgRx or Akita
import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { User } from '../models/user.model';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

@Injectable()
export class UserStore extends ComponentStore<UserState> {
  constructor() {
    super({
      users: [],
      loading: false,
      error: null
    });
  }

  // Selectors
  readonly users$ = this.select(state => state.users);
  readonly loading$ = this.select(state => state.loading);
  readonly error$ = this.select(state => state.error);

  // Updaters
  readonly setUsers = this.updater((state, users: User[]) => ({
    ...state,
    users
  }));

  readonly setLoading = this.updater((state, loading: boolean) => ({
    ...state,
    loading
  }));
}
```

## Common Issues

### 1. Build Warnings

If you get warnings about CommonJS dependencies, add them to `allowedCommonJsDependencies` in `angular.json`.

### 2. Decorator Issues

Ensure TypeScript configuration includes experimental decorators support.

### 3. Real-time Subscriptions

Always unsubscribe from real-time listeners in `ngOnDestroy` to prevent memory leaks.

## Next Steps

- Learn more about [Real-time Features](../realtime.md)
- Explore [Performance Optimization](../advanced/performance.md)
- Check out [Security Best Practices](../advanced/security.md)