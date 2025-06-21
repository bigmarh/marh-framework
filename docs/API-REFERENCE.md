# MARH Framework API Reference

Complete API reference for all MARH Framework components, hooks, services, and utilities.

## Table of Contents

1. [Core Framework (@marh/core)](#core-framework)
2. [Hooks](#hooks)
3. [Store System](#store-system)
4. [Database System](#database-system)
5. [Cache Service](#cache-service)
6. [CRUD Interface](#crud-interface)
7. [Utilities](#utilities)
8. [Types](#types)

## Core Framework

### `m` - Mithril Export

```typescript
import { m } from '@marh/core';
```

The core Mithril object, re-exported for convenience. Use this for all Mithril functionality.

**Example:**
```tsx
import { m } from '@marh/core';

export const MyComponent = () => {
  return (
    <div onclick={() => console.log('clicked')}>
      Hello World
    </div>
  );
};
```

### Component Function

```typescript
type Component<T = {}> = (props: T) => JSX.Element;
```

Base type for MARH components.

## Hooks

### `useState<T>`

```typescript
function useState<T>(initialValue: T): [T, (newValue: T | ((prev: T) => T)) => void];
```

Manages local component state with automatic re-rendering.

**Parameters:**
- `initialValue: T` - Initial state value

**Returns:**
- `[state, setState]` - Current state and setter function

**Example:**
```tsx
import { useState } from '@marh/core';

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onclick={() => setCount(count + 1)}>Increment</button>
      <button onclick={() => setCount(prev => prev - 1)}>Decrement</button>
    </div>
  );
};
```

### `useEffect`

```typescript
function useEffect(effect: () => void | (() => void), deps?: any[]): void;
```

Runs side effects in components with optional cleanup and dependency tracking.

**Parameters:**
- `effect: () => void | (() => void)` - Effect function, optionally returning cleanup function
- `deps?: any[]` - Optional dependency array

**Example:**
```tsx
import { useEffect, useState } from '@marh/core';

export const Timer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // Cleanup function
    return () => clearInterval(interval);
  }, []); // Empty deps = run once on mount

  return <div>Timer: {seconds}s</div>;
};
```

### `useAsync<T>`

```typescript
function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps?: any[]
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

Manages async operations with loading and error states.

**Parameters:**
- `asyncFn: () => Promise<T>` - Async function to execute
- `deps?: any[]` - Optional dependency array

**Returns:**
- `data: T | null` - Result data or null
- `loading: boolean` - Loading state
- `error: Error | null` - Error if operation failed
- `refetch: () => Promise<void>` - Function to retry the operation

**Example:**
```tsx
import { useAsync } from '@marh/core';

export const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, loading, error, refetch } = useAsync(
    () => userService.findById(userId),
    [userId]
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onclick={refetch}>Refresh</button>
    </div>
  );
};
```

## Store System

### `Store<T>`

```typescript
abstract class Store<T> {
  protected constructor(initialState: T);
  
  get state(): T;
  protected setState(updates: Partial<T> | ((prevState: T) => Partial<T>)): void;
  subscribe(callback: (state: T) => void): () => void;
}
```

Base class for state management with automatic Mithril re-rendering.

**Methods:**

#### `setState`

```typescript
protected setState(updates: Partial<T> | ((prevState: T) => Partial<T>)): void;
```

Updates store state and triggers re-render.

**Parameters:**
- `updates` - Partial state updates or function returning updates

#### `subscribe`

```typescript
subscribe(callback: (state: T) => void): () => void;
```

Subscribes to state changes.

**Parameters:**
- `callback: (state: T) => void` - Function called on state changes

**Returns:**
- `() => void` - Unsubscribe function

**Example:**
```typescript
import { Store } from '@marh/core';

interface CounterState {
  count: number;
  step: number;
}

export class CounterStore extends Store<CounterState> {
  constructor() {
    super({ count: 0, step: 1 });
  }

  increment() {
    this.setState({ count: this.state.count + this.state.step });
  }

  decrement() {
    this.setState({ count: this.state.count - this.state.step });
  }

  setStep(step: number) {
    this.setState({ step });
  }

  reset() {
    this.setState({ count: 0 });
  }

  // Computed property
  get isPositive() {
    return this.state.count > 0;
  }
}

export const counterStore = new CounterStore();
```

## Database System

### `createDatabase`

```typescript
function createDatabase(config: DatabaseConfig): IDatabase;
```

Creates a database instance with the specified configuration.

**Parameters:**
- `config: DatabaseConfig` - Database configuration

**Example:**
```typescript
import { createDatabase } from '@marh/shared/database';

const db = createDatabase({
  type: 'auto', // or 'memory', 'sqlite', 'indexeddb', 'rest-api'
  name: 'my-app-db'
});
```

### `DatabaseConfig`

```typescript
interface DatabaseConfig {
  type: 'auto' | 'memory' | 'sqlite' | 'indexeddb' | 'rest-api';
  name: string;
  options?: Record<string, any>;
}
```

Database configuration options.

### `IDatabase`

```typescript
interface IDatabase {
  table<T extends BaseEntity>(name: string): ITable<T>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(migrations?: Migration[]): Promise<void>;
  transaction<T>(callback: (trx: ITransaction) => Promise<T>): Promise<T>;
  isConnected: boolean;
  config: DatabaseConfig;
}
```

Main database interface.

**Methods:**

#### `table<T>`

```typescript
table<T extends BaseEntity>(name: string): ITable<T>;
```

Gets a table interface for the specified entity type.

### `ITable<T>`

```typescript
interface ITable<T extends BaseEntity> {
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  findById(id: string | number): Promise<T | null>;
  findAll(): Promise<T[]>;
  findWhere(conditions: Partial<T>): Promise<T[]>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
  createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
  deleteMany(conditions: Partial<T>): Promise<number>;
  count(conditions?: Partial<T>): Promise<number>;
  createIndex(field: keyof T): Promise<void>;
  name: string;
}
```

Table interface for CRUD operations.

**Example:**
```typescript
import { createDatabase } from '@marh/shared/database';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const db = createDatabase({ type: 'auto', name: 'app' });
const userTable = db.table<User>('users');

// Create a user
const newUser = await userTable.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Find by ID
const user = await userTable.findById(newUser.id);

// Update user
const updatedUser = await userTable.update(newUser.id, {
  name: 'John Smith'
});

// Find all users
const allUsers = await userTable.findAll();

// Delete user
await userTable.delete(newUser.id);
```

## Cache Service

### `CacheService`

```typescript
class CacheService {
  constructor(maxSize?: number);
  
  get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  getStats(): CacheStats;
}
```

High-performance caching service with TTL support.

**Methods:**

#### `get<T>`

```typescript
async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
```

Gets value from cache or fetches and caches it.

**Parameters:**
- `key: string` - Cache key
- `fetcher: () => Promise<T>` - Function to fetch value if not cached
- `ttl?: number` - Time to live in milliseconds (default: 5 minutes)

#### `set<T>`

```typescript
set<T>(key: string, value: T, ttl?: number): void;
```

Sets a value in the cache.

#### `getStats`

```typescript
getStats(): CacheStats;
```

Returns cache statistics.

**Example:**
```typescript
import { CacheService } from '@marh/shared/services/cache.service';

const cache = new CacheService(100); // Max 100 items

// Cache API response for 10 minutes
const userData = await cache.get(
  `user-${userId}`,
  () => userApi.fetchUser(userId),
  10 * 60 * 1000
);

// Manual cache operations
cache.set('config', { theme: 'dark' }, 60000);
const config = cache.has('config') ? cache.get('config') : null;

// View cache statistics
const stats = cache.getStats();
console.log(`Cache: ${stats.size} items, ${stats.hits} hits, ${stats.misses} misses`);
```

## CRUD Interface

### `ICrudService<T>`

```typescript
interface ICrudService<T extends BaseEntity> {
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  findById(id: string | number): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
  
  // Optional methods
  findWhere?(conditions: Partial<T>): Promise<T[]>;
  createMany?(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
  deleteMany?(conditions: Partial<T>): Promise<number>;
  count?(conditions?: Partial<T>): Promise<number>;
}
```

Standard CRUD interface for services.

**Example Implementation:**
```typescript
import { ICrudService } from '@marh/shared/services/crud.interface';

export class TaskService implements ICrudService<Task> {
  private table = db.table<Task>('tasks');

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return await this.table.create({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async findById(id: string): Promise<Task | null> {
    return await this.table.findById(id);
  }

  async findAll(): Promise<Task[]> {
    return await this.table.findAll();
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    return await this.table.update(id, {
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<boolean> {
    return await this.table.delete(id);
  }

  // Custom methods
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return await this.table.findWhere({ status });
  }
}
```

## Utilities

### `formatDate`

```typescript
function formatDate(date: Date, format?: string): string;
```

Formats dates consistently across the application.

**Parameters:**
- `date: Date` - Date to format
- `format?: string` - Format string (default: 'YYYY-MM-DD')

### `debounce`

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): T;
```

Creates a debounced version of a function.

**Example:**
```typescript
import { debounce } from '@marh/core/utils';

const debouncedSearch = debounce((query: string) => {
  searchService.search(query);
}, 300);

// In component
<input oninput={(e) => debouncedSearch(e.target.value)} />
```

### `throttle`

```typescript
function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): T;
```

Creates a throttled version of a function.

### `generateId`

```typescript
function generateId(): string;
```

Generates a unique ID string.

## Types

### `BaseEntity`

```typescript
interface BaseEntity {
  id: string | number;
  createdAt: Date;
  updatedAt: Date;
}
```

Base interface for database entities.

### `Platform`

```typescript
type Platform = 'web' | 'desktop' | 'pwa';
```

Supported platform types.

### `CacheStats`

```typescript
interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}
```

Cache performance statistics.

### `AsyncState<T>`

```typescript
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
```

State structure for async operations.

### JSX Types

MARH Framework includes complete JSX type definitions for Mithril:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    div: HTMLAttributes;
    span: HTMLAttributes;
    button: ButtonHTMLAttributes;
    input: InputHTMLAttributes;
    // ... all HTML elements
  }

  interface HTMLAttributes {
    class?: string;
    onclick?: (event: MouseEvent) => void;
    onchange?: (event: Event) => void;
    // ... all HTML attributes
  }
}
```

**Key Differences from React:**
- Use `class` instead of `className`
- Event handlers are lowercase: `onclick`, `onchange`, etc.
- Some Mithril-specific attributes are available

## Error Handling

### `DatabaseError`

```typescript
class DatabaseError extends Error {
  constructor(message: string, cause?: Error);
}
```

### `ValidationError`

```typescript
class ValidationError extends Error {
  constructor(message: string, field?: string);
  field?: string;
}
```

### `CacheError`

```typescript
class CacheError extends Error {
  constructor(message: string);
}
```

## Configuration

### Environment Variables

MARH Framework respects these environment variables:

```bash
# Development
NODE_ENV=development|production
VITE_API_URL=http://localhost:3000
VITE_DATABASE_TYPE=auto|memory|sqlite|indexeddb

# Database
DATABASE_URL=sqlite://./app.db
DATABASE_POOL_SIZE=10

# Cache
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=300000
```

## Platform Detection

```typescript
import { detectPlatform } from '@marh/core/utils';

const platform = detectPlatform();
// Returns: 'web' | 'desktop' | 'pwa'

if (platform === 'desktop') {
  // Desktop-specific code
} else if (platform === 'pwa') {
  // PWA-specific code
}
```

## Advanced Usage

### Custom Database Adapter

```typescript
import { BaseDatabaseAdapter } from '@marh/shared/database/adapters/base-adapter';

export class CustomAdapter extends BaseDatabaseAdapter {
  constructor() {
    super('custom', ['web', 'desktop']);
  }

  createDatabase(config: DatabaseConfig): IDatabase {
    return new CustomDatabase(config);
  }
}

// Register adapter
DatabaseAdapterRegistry.register(new CustomAdapter());
```

### Custom Hook

```typescript
import { useState, useEffect } from '@marh/core';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

This API reference covers all the main MARH Framework APIs. For more detailed examples and patterns, see the [Tutorial](./TUTORIAL.md) and [Best Practices](./BEST-PRACTICES.md) guides.