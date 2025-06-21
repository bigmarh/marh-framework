/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

/**
 * Base Cache Service
 * 
 * Provides in-memory caching with TTL (time to live) support.
 * Useful for caching API responses, computed values, or any expensive operations.
 * 
 * Features:
 * - TTL-based cache expiration
 * - Type-safe caching
 * - Memory management (max cache size)
 * - Cache statistics
 * - Manual cache invalidation
 */
export class CacheService {
  protected cache = new Map<string, CacheEntry<any>>();
  protected maxSize: number = 100; // Maximum number of cache entries
  protected hits: number = 0;
  protected misses: number = 0;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Get cached data or fetch it
   * 
   * @param key - Unique cache key
   * @param fetcher - Function to fetch data if not cached
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns Cached or freshly fetched data
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data
    if (entry && now - entry.timestamp < entry.ttl) {
      this.hits++;
      return entry.data as T;
    }

    // Cache miss - fetch new data
    this.misses++;
    
    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // If fetch fails and we have stale data, return it
      if (entry) {
        console.warn(`Cache fetch failed for key "${key}", returning stale data`, error);
        return entry.data as T;
      }
      throw error;
    }
  }

  /**
   * Set cache data directly
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Enforce max cache size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isValid = Date.now() - entry.timestamp < entry.ttl;
    if (!isValid) {
      this.cache.delete(key);
    }
    return isValid;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  protected evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Create a memoized version of a function
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    const generateKey = keyGenerator || ((...args) => JSON.stringify(args));

    return (async (...args: Parameters<T>) => {
      const key = `memoize:${fn.name}:${generateKey(...args)}`;
      return this.get(key, () => fn(...args), ttl);
    }) as T;
  }
}

/**
 * Singleton instance of CacheService
 */
export const cacheService = new CacheService();

/**
 * Cache decorator for methods
 * 
 * Usage:
 * ```typescript
 * class UserService {
 *   @cached(60000) // 1 minute TTL
 *   async getUser(id: string) {
 *     return fetch(`/api/users/${id}`).then(r => r.json());
 *   }
 * }
 * ```
 */
export function cached(ttl: number = 5 * 60 * 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      return cacheService.get(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}