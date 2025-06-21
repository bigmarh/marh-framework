# Cache Service in MARH Framework

MARH Framework includes a powerful caching service that helps improve application performance by storing expensive operation results in memory.

## Overview

The Cache Service provides:
- TTL-based cache expiration
- Type-safe caching with TypeScript
- Memory management with configurable max cache size
- Cache statistics and monitoring
- Platform-specific implementations (Desktop/PWA)
- Multiple caching strategies (PWA)
- Decorator support for easy method caching

## Basic Usage

### Simple Caching

```typescript
import { cacheService } from '../services/cache.service';

// Cache an API call
const users = await cacheService.get(
  'users-list',                    // Cache key
  () => fetch('/api/users').then(r => r.json()),  // Fetcher function
  5 * 60 * 1000                    // TTL: 5 minutes
);
```

### Direct Cache Manipulation

```typescript
// Set cache directly
cacheService.set('user:123', userData, 60000); // 1 minute TTL

// Check if cached
if (cacheService.has('user:123')) {
  // Use cached data
}

// Invalidate specific key
cacheService.invalidate('user:123');

// Invalidate by pattern
cacheService.invalidatePattern(/^user:/); // Invalidate all user cache

// Clear entire cache
cacheService.clear();
```

### Cache Statistics

```typescript
const stats = cacheService.getStats();
console.log(stats);
// {
//   size: 25,
//   maxSize: 100,
//   hits: 150,
//   misses: 25,
//   hitRate: '85.71%'
// }
```

## Platform-Specific Features

### Desktop Cache Service

The desktop implementation includes:
- **Larger cache size** (500 entries default)
- **Persistent storage** via IPC to disk
- **File caching** with automatic invalidation on file changes
- **Background cleanup** tasks

```typescript
// Desktop-specific: Persistent caching
cacheService.setPersistent('app-settings', settings, 24 * 60 * 60 * 1000); // 24 hours

// Desktop-specific: File caching
const config = await cacheService.cacheFile(
  '/path/to/config.json',
  (content) => JSON.parse(content),
  10 * 60 * 1000 // 10 minutes
);
```

### PWA Cache Service

The PWA implementation includes:
- **IndexedDB persistence** for offline support
- **Network-aware strategies**
- **Smaller cache size** (50 entries for mobile)
- **Service worker integration**

```typescript
// PWA-specific: Network-first strategy
const data = await cacheService.networkFirst(
  'api-data',
  () => fetch('/api/data').then(r => r.json()),
  5 * 60 * 1000
);

// PWA-specific: Cache-first strategy (good for static assets)
const asset = await cacheService.cacheFirst(
  'static-asset',
  () => fetch('/assets/data.json').then(r => r.json()),
  24 * 60 * 60 * 1000 // 24 hours
);

// PWA-specific: Stale-while-revalidate
const content = await cacheService.staleWhileRevalidate(
  'dynamic-content',
  () => fetch('/api/content').then(r => r.json()),
  10 * 60 * 1000
);
```

## Advanced Features

### Memoization

Convert any async function into a cached version:

```typescript
// Original function
async function fetchUserDetails(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// Memoized version
const cachedFetchUser = cacheService.memoize(
  fetchUserDetails,
  (userId) => `user:${userId}`, // Key generator
  60000 // 1 minute TTL
);

// Usage - subsequent calls with same ID are cached
const user = await cachedFetchUser('123');
```

### Decorator Pattern

Use the `@cached` decorator for class methods:

```typescript
import { cached } from '../services/cache.service';

class UserService {
  @cached(60000) // 1 minute cache
  async getUser(id: string) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }

  @cached(5 * 60 * 1000) // 5 minutes cache
  async listUsers(page: number = 1) {
    const response = await fetch(`/api/users?page=${page}`);
    return response.json();
  }
}
```

## Caching Strategies (PWA)

### Network First
Best for: API calls where fresh data is preferred

```typescript
// Try network, fall back to cache if offline
const data = await cacheService.networkFirst(key, fetcher, ttl);
```

### Cache First
Best for: Static assets, infrequently changing data

```typescript
// Use cache if available, otherwise fetch
const data = await cacheService.cacheFirst(key, fetcher, ttl);
```

### Stale While Revalidate
Best for: Content that should load fast but stay fresh

```typescript
// Return stale data immediately, update in background
const data = await cacheService.staleWhileRevalidate(key, fetcher, ttl);
```

## Best Practices

### 1. Choose Appropriate TTLs

```typescript
// Short TTL for frequently changing data
cacheService.get('live-data', fetcher, 30 * 1000); // 30 seconds

// Medium TTL for semi-static data
cacheService.get('user-profile', fetcher, 5 * 60 * 1000); // 5 minutes

// Long TTL for static data
cacheService.get('app-config', fetcher, 24 * 60 * 60 * 1000); // 24 hours
```

### 2. Use Meaningful Cache Keys

```typescript
// Good: Descriptive and unique
`user:${userId}`
`api:users:page:${page}:limit:${limit}`
`file:${filePath}:${lastModified}`

// Bad: Too generic
'data'
'users'
'cache1'
```

### 3. Handle Cache Invalidation

```typescript
// After updating a user
async function updateUser(userId: string, data: any) {
  await api.updateUser(userId, data);
  
  // Invalidate related caches
  cacheService.invalidate(`user:${userId}`);
  cacheService.invalidatePattern(/^api:users:/); // Invalidate user lists
}
```

### 4. Monitor Cache Performance

```typescript
// Log cache stats periodically
setInterval(() => {
  const stats = cacheService.getStats();
  if (stats.hitRate < 50) {
    console.warn('Low cache hit rate:', stats);
  }
}, 60000);
```

## Example: API Service with Caching

```typescript
import { cacheService, cached } from '../services/cache.service';

export class ApiService {
  private baseUrl = '/api';

  // Simple caching with decorator
  @cached(5 * 60 * 1000)
  async getUsers(page: number = 1) {
    const response = await fetch(`${this.baseUrl}/users?page=${page}`);
    return response.json();
  }

  // Manual caching with invalidation
  async getUser(id: string) {
    return cacheService.get(
      `user:${id}`,
      async () => {
        const response = await fetch(`${this.baseUrl}/users/${id}`);
        return response.json();
      },
      10 * 60 * 1000 // 10 minutes
    );
  }

  async updateUser(id: string, data: any) {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate caches after update
    cacheService.invalidate(`user:${id}`);
    cacheService.invalidatePattern(/^users:/);
    
    return response.json();
  }

  // PWA-specific: Handle offline scenarios
  async getUsersPWA(page: number = 1) {
    if ('cacheFirst' in cacheService) {
      // Use cache-first strategy for better offline experience
      return (cacheService as any).cacheFirst(
        `users:page:${page}`,
        () => this.getUsers(page),
        30 * 60 * 1000 // 30 minutes
      );
    }
    return this.getUsers(page);
  }
}

export const apiService = new ApiService();
```

## Memory Management

The cache service automatically manages memory:

1. **Size Limits**: Configurable maximum entries (Desktop: 500, PWA: 50)
2. **Automatic Eviction**: Oldest entries removed when limit reached
3. **Cleanup**: Expired entries cleaned periodically (Desktop) or on access
4. **Manual Control**: Clear cache when needed

```typescript
// Configure max size
const customCache = new CacheService(200); // Max 200 entries

// Manual cleanup
cacheService.cleanup(); // Remove expired entries

// Reset everything
cacheService.clear();
cacheService.resetStats();
```

The Cache Service is a powerful tool for improving application performance while maintaining a simple, intuitive API.