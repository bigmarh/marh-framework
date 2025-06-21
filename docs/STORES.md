# Store Pattern in MARH Framework

MARH Framework includes a simple but powerful store pattern for managing global state in your Mithril applications.

## When to Use Stores

**Use stores for:**
- State that needs to be shared across multiple components
- App-wide settings (theme, user preferences)
- Data that persists across route changes
- Global UI state (notifications, modals, loading states)

**Use local component state for:**
- Form inputs and validation
- Component-specific UI state (collapsed/expanded)
- Temporary data that doesn't need to be shared

## Basic Usage

### Creating a Store

```typescript
import { Store } from '@marh/core';

interface CounterState {
  count: number;
  step: number;
}

class CounterStore extends Store<CounterState> {
  constructor() {
    super({ count: 0, step: 1 });
  }

  get count(): number {
    return this.state.count;
  }

  increment(): void {
    this.setState({ count: this.state.count + this.state.step });
  }

  decrement(): void {
    this.setState({ count: this.state.count - this.state.step });
  }

  reset(): void {
    this.setState({ count: 0, step: 1 });
  }
}

export const counterStore = new CounterStore();
```

### Using Stores in Components

```jsx
import { m, MarhComponent } from '@marh/core';
import { counterStore } from '../stores/counter.store';

export const Counter: MarhComponent = {
  view() {
    return (
      <div>
        <span>Count: {counterStore.count}</span>
        <button onclick={() => counterStore.increment()}>+</button>
        <button onclick={() => counterStore.decrement()}>-</button>
        <button onclick={() => counterStore.reset()}>Reset</button>
      </div>
    );
  }
};
```

## Alternative: Functional Store Pattern

For simpler use cases, you can use the `createStore` function:

```typescript
import { createStore } from '@marh/core';

interface UserState {
  name: string;
  email: string;
  isLoggedIn: boolean;
}

export const userStore = createStore<UserState>({
  name: '',
  email: '',
  isLoggedIn: false
});

// Usage
userStore.set({ isLoggedIn: true, name: 'John' });
const currentUser = userStore.get();
userStore.reset();
```

## Key Features

### Automatic Re-renders

The `setState()` method automatically calls `m.redraw()`, ensuring all components that use the store are updated:

```typescript
// This will trigger a redraw of all components using this store
this.setState({ count: newCount });
```

### Immutable Updates

State updates are immutable - the store merges changes with existing state:

```typescript
// Before: { count: 5, step: 1, name: 'Counter' }
this.setState({ count: 10 });
// After: { count: 10, step: 1, name: 'Counter' }
```

### TypeScript Support

Full TypeScript support with type-safe state management:

```typescript
interface AppState {
  theme: 'light' | 'dark';
  notifications: Notification[];
}

class AppStore extends Store<AppState> {
  // TypeScript will enforce that setState only accepts valid AppState properties
  toggleTheme(): void {
    this.setState({
      theme: this.state.theme === 'light' ? 'dark' : 'light'
    });
  }
}
```

## Example: App Store

Here's a complete example of a typical app store:

```typescript
import { Store } from '@marh/core';

interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  isLoading: boolean;
  notifications: Notification[];
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

class AppStore extends Store<AppState> {
  constructor() {
    super({
      theme: 'light',
      sidebarOpen: false,
      isLoading: false,
      notifications: []
    });
  }

  // Getters for convenient access
  get theme() { return this.state.theme; }
  get sidebarOpen() { return this.state.sidebarOpen; }
  get isLoading() { return this.state.isLoading; }
  get notifications() { return this.state.notifications; }

  // Actions
  toggleTheme(): void {
    this.setState({
      theme: this.state.theme === 'light' ? 'dark' : 'light'
    });
  }

  toggleSidebar(): void {
    this.setState({ sidebarOpen: !this.state.sidebarOpen });
  }

  setLoading(loading: boolean): void {
    this.setState({ isLoading: loading });
  }

  addNotification(message: string, type: Notification['type'] = 'info'): void {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };

    this.setState({
      notifications: [...this.state.notifications, notification]
    });

    // Auto-remove after 5 seconds
    setTimeout(() => this.removeNotification(notification.id), 5000);
  }

  removeNotification(id: string): void {
    this.setState({
      notifications: this.state.notifications.filter(n => n.id !== id)
    });
  }

  reset(): void {
    this.setState({
      theme: 'light',
      sidebarOpen: false,
      isLoading: false,
      notifications: []
    });
  }
}

export const appStore = new AppStore();
```

## Best Practices

### 1. Use Singleton Instances

Export store instances, not classes:

```typescript
// ✅ Good
export const userStore = new UserStore();

// ❌ Avoid
export class UserStore extends Store<UserState> { }
```

### 2. Keep Stores Focused

Each store should have a single responsibility:

```typescript
// ✅ Good - focused stores
export const userStore = new UserStore();
export const cartStore = new CartStore();
export const notificationStore = new NotificationStore();

// ❌ Avoid - monolithic store
export const appStore = new AllInOneStore();
```

### 3. Use Getters for Computed Values

```typescript
class UserStore extends Store<UserState> {
  get fullName(): string {
    return `${this.state.firstName} ${this.state.lastName}`;
  }

  get isAdmin(): boolean {
    return this.state.role === 'admin';
  }
}
```

### 4. Handle Async Operations

```typescript
class DataStore extends Store<DataState> {
  async loadUsers(): Promise<void> {
    this.setState({ loading: true, error: null });
    
    try {
      const users = await api.getUsers();
      this.setState({ users, loading: false });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }
}
```

### 5. Persist Important State

```typescript
class SettingsStore extends Store<SettingsState> {
  setTheme(theme: 'light' | 'dark'): void {
    this.setState({ theme });
    localStorage.setItem('theme', theme);
  }

  constructor() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    super({
      theme: savedTheme || 'light'
    });
  }
}
```

## Integration with Mithril

The store pattern integrates seamlessly with Mithril's component lifecycle:

```jsx
export const MyComponent: MarhComponent = {
  oninit() {
    // Load data when component initializes
    dataStore.loadData();
  },

  view() {
    // Component automatically re-renders when store state changes
    if (dataStore.loading) return <div>Loading...</div>;
    if (dataStore.error) return <div>Error: {dataStore.error}</div>;
    
    return (
      <div>
        {dataStore.items.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    );
  }
};
```

## Testing Stores

Stores are easy to test since they're just classes with methods:

```typescript
import { counterStore } from '../stores/counter.store';

describe('CounterStore', () => {
  beforeEach(() => {
    counterStore.reset();
  });

  it('should increment count', () => {
    counterStore.increment();
    expect(counterStore.count).toBe(1);
  });

  it('should decrement count', () => {
    counterStore.setCount(5);
    counterStore.decrement();
    expect(counterStore.count).toBe(4);
  });
});
```

The store pattern provides a simple, type-safe way to manage global state in MARH applications while maintaining the reactive nature of Mithril components.

## Template Structure

MARH Framework templates use a shared structure to reduce code duplication:

```
templates/
├── shared/
│   └── src/
│       ├── stores/
│       │   ├── counter.store.ts      # Shared counter example
│       │   └── base-app.store.ts     # Base app store class
│       └── components/
│           ├── StoreCounter.tsx      # Shared counter component
│           └── NotificationList.tsx  # Shared notification component
├── desktop/
│   └── src/
│       └── stores/
│           ├── counter.store.ts      # Re-exports shared counter
│           └── app.store.ts          # Extends BaseAppStore
└── pwa/
    └── src/
        └── stores/
            ├── counter.store.ts      # Re-exports shared counter
            └── app.store.ts          # Extends BaseAppStore with PWA features
```

### Shared Components

Common components are stored in `templates/shared/src/components/` and imported by both desktop and PWA templates:

```jsx
// In desktop/src/pages/Home.tsx
import { StoreCounter } from '../../shared/src/components/StoreCounter';
import { NotificationList } from '../../shared/src/components/NotificationList';
```

### Platform-Specific Stores

Each platform extends the shared base classes:

```typescript
// Desktop extends base functionality
class DesktopAppStore extends BaseAppStore<DesktopAppState> {
  // Add desktop-specific methods here
}

// PWA adds online/offline and install prompt features
class PWAAppStore extends BaseAppStore<PWAAppState> {
  get isOnline(): boolean { /* ... */ }
  async promptInstall(): Promise<void> { /* ... */ }
}
```

This structure eliminates code duplication while allowing platform-specific customization.