/**
 * Cache Service Tests
 * 
 * Comprehensive tests for the cache service functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils, TEST_CONSTANTS } from '../../test/setup';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(10); // Small cache for testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Operations', () => {
    it('should set and get cached values', () => {
      cacheService.set('key1', 'value1', 1000);
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cacheService.has('nonexistent')).toBe(false);
      expect(cacheService.get('nonexistent')).toBeUndefined();
    });

    it('should invalidate specific keys', () => {
      cacheService.set('key1', 'value1', 1000);
      cacheService.set('key2', 'value2', 1000);
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);
      
      cacheService.invalidate('key1');
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
    });

    it('should clear all cache entries', () => {
      cacheService.set('key1', 'value1', 1000);
      cacheService.set('key2', 'value2', 1000);
      
      expect(cacheService.getStats().size).toBe(2);
      
      cacheService.clear();
      
      expect(cacheService.getStats().size).toBe(0);
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('key1', 'value1', 100); // 100ms TTL
      
      expect(cacheService.has('key1')).toBe(true);
      
      // Fast-forward time by 150ms
      vi.advanceTimersByTime(150);
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      cacheService.set('key1', 'value1', 200); // 200ms TTL
      
      // Fast-forward time by 100ms (less than TTL)
      vi.advanceTimersByTime(100);
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.get('key1')).toBe('value1');
    });

    it('should handle entries with no TTL (never expire)', () => {
      cacheService.set('key1', 'value1'); // No TTL
      
      // Fast-forward time significantly
      vi.advanceTimersByTime(10000);
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.get('key1')).toBe('value1');
    });
  });

  describe('Async Cache Operations', () => {
    it('should cache async function results', async () => {
      const asyncFunction = vi.fn().mockResolvedValue('async-result');
      
      const result1 = await cacheService.get('async-key', asyncFunction, 1000);
      const result2 = await cacheService.get('async-key', asyncFunction, 1000);
      
      expect(result1).toBe('async-result');
      expect(result2).toBe('async-result');
      expect(asyncFunction).toHaveBeenCalledTimes(1); // Should only call once
    });

    it('should handle async function errors', async () => {
      const asyncFunction = vi.fn().mockRejectedValue(new Error('Async error'));
      
      await expect(
        cacheService.get('error-key', asyncFunction, 1000)
      ).rejects.toThrow('Async error');
      
      // Should not cache errors
      expect(cacheService.has('error-key')).toBe(false);
    });

    it('should re-fetch when cached async result expires', async () => {
      const asyncFunction = vi.fn()
        .mockResolvedValueOnce('first-result')
        .mockResolvedValueOnce('second-result');
      
      // First call
      const result1 = await cacheService.get('async-key', asyncFunction, 100);
      expect(result1).toBe('first-result');
      
      // Fast-forward past TTL
      vi.advanceTimersByTime(150);
      
      // Second call after expiration
      const result2 = await cacheService.get('async-key', asyncFunction, 100);
      expect(result2).toBe('second-result');
      
      expect(asyncFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memoization', () => {
    it('should memoize function calls', () => {
      const expensiveFunction = vi.fn((x: number) => x * 2);
      const memoized = cacheService.memoize(
        expensiveFunction,
        (x: number) => `calc:${x}`,
        1000
      );
      
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10); // Should use cached result
      expect(memoized(10)).toBe(20);
      
      expect(expensiveFunction).toHaveBeenCalledTimes(2); // Only for unique inputs
    });

    it('should re-compute memoized functions after TTL', () => {
      const expensiveFunction = vi.fn((x: number) => x * 2);
      const memoized = cacheService.memoize(
        expensiveFunction,
        (x: number) => `calc:${x}`,
        100 // 100ms TTL
      );
      
      expect(memoized(5)).toBe(10);
      
      // Fast-forward past TTL
      vi.advanceTimersByTime(150);
      
      expect(memoized(5)).toBe(10); // Should re-compute
      expect(expensiveFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching regex pattern', () => {
      cacheService.set('user:1', 'user1', 1000);
      cacheService.set('user:2', 'user2', 1000);
      cacheService.set('post:1', 'post1', 1000);
      cacheService.set('post:2', 'post2', 1000);
      
      // Invalidate all user keys
      cacheService.invalidatePattern(/^user:/);
      
      expect(cacheService.has('user:1')).toBe(false);
      expect(cacheService.has('user:2')).toBe(false);
      expect(cacheService.has('post:1')).toBe(true);
      expect(cacheService.has('post:2')).toBe(true);
    });

    it('should invalidate keys matching string pattern', () => {
      cacheService.set('api:users:list', 'users', 1000);
      cacheService.set('api:users:detail:1', 'user1', 1000);
      cacheService.set('api:posts:list', 'posts', 1000);
      
      // Invalidate all api:users keys
      cacheService.invalidatePattern('api:users');
      
      expect(cacheService.has('api:users:list')).toBe(false);
      expect(cacheService.has('api:users:detail:1')).toBe(false);
      expect(cacheService.has('api:posts:list')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      // Initially empty
      const initialStats = cacheService.getStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);
      
      // Add entries and track hits/misses
      cacheService.set('key1', 'value1', 1000);
      cacheService.set('key2', 'value2', 1000);
      
      // Cache hits
      cacheService.get('key1');
      cacheService.get('key1');
      
      // Cache miss
      cacheService.get('nonexistent');
      
      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should reset statistics', () => {
      cacheService.set('key1', 'value1', 1000);
      cacheService.get('key1');
      cacheService.get('nonexistent');
      
      let stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      cacheService.resetStats();
      
      stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('Cache Size Limits', () => {
    it('should respect max cache size', () => {
      const smallCache = new CacheService(3); // Max 3 entries
      
      smallCache.set('key1', 'value1', 1000);
      smallCache.set('key2', 'value2', 1000);
      smallCache.set('key3', 'value3', 1000);
      
      expect(smallCache.getStats().size).toBe(3);
      
      // Adding 4th entry should evict oldest
      smallCache.set('key4', 'value4', 1000);
      
      expect(smallCache.getStats().size).toBe(3);
      expect(smallCache.has('key1')).toBe(false); // Oldest should be evicted
      expect(smallCache.has('key4')).toBe(true);
    });

    it('should evict least recently used entries', () => {
      const smallCache = new CacheService(2); // Max 2 entries
      
      smallCache.set('key1', 'value1', 1000);
      smallCache.set('key2', 'value2', 1000);
      
      // Access key1 to make it recently used
      smallCache.get('key1');
      
      // Add key3, should evict key2 (least recently used)
      smallCache.set('key3', 'value3', 1000);
      
      expect(smallCache.has('key1')).toBe(true); // Recently used
      expect(smallCache.has('key2')).toBe(false); // Should be evicted
      expect(smallCache.has('key3')).toBe(true);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up expired entries', () => {
      cacheService.set('key1', 'value1', 100); // Will expire
      cacheService.set('key2', 'value2', 1000); // Will not expire
      cacheService.set('key3', 'value3'); // No TTL
      
      // Fast-forward past first entry's TTL
      vi.advanceTimersByTime(150);
      
      cacheService.cleanup();
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
      expect(cacheService.has('key3')).toBe(true);
      expect(cacheService.getStats().size).toBe(2);
    });

    it('should handle concurrent access during cleanup', () => {
      cacheService.set('key1', 'value1', 100);
      cacheService.set('key2', 'value2', 1000);
      
      // Fast-forward past first entry's TTL
      vi.advanceTimersByTime(150);
      
      // Access during cleanup
      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBe('value2');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid TTL values', () => {
      expect(() => {
        cacheService.set('key1', 'value1', -100); // Negative TTL
      }).not.toThrow();
      
      // Should treat negative TTL as no expiration
      vi.advanceTimersByTime(1000);
      expect(cacheService.has('key1')).toBe(true);
    });

    it('should handle large objects', () => {
      const largeObject = {
        data: new Array(1000).fill('large data string'),
        nested: {
          moreData: new Array(500).fill('more data')
        }
      };
      
      expect(() => {
        cacheService.set('large-key', largeObject, 1000);
      }).not.toThrow();
      
      expect(cacheService.get('large-key')).toEqual(largeObject);
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        cacheService.set('circular-key', circular, 1000);
      }).not.toThrow();
      
      const retrieved = cacheService.get('circular-key');
      expect(retrieved.name).toBe('test');
      expect(retrieved.self).toBe(retrieved);
    });
  });

  describe('Performance', () => {
    it('should perform operations efficiently', () => {
      const performanceTimer = TestUtils.mockPerformanceNow();
      
      // Add many entries
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`key${i}`, `value${i}`, 1000);
      }
      
      const addTime = performanceTimer();
      
      // Access many entries
      for (let i = 0; i < 1000; i++) {
        cacheService.get(`key${i}`);
      }
      
      const accessTime = performanceTimer() - addTime;
      
      // Operations should be fast (less than 100ms for 1000 operations)
      expect(addTime).toBeLessThan(100);
      expect(accessTime).toBeLessThan(100);
    });

    it('should handle rapid TTL expirations efficiently', () => {
      // Add many entries with short TTL
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key${i}`, `value${i}`, 10);
      }
      
      expect(cacheService.getStats().size).toBe(100);
      
      // Fast-forward to expire all entries
      vi.advanceTimersByTime(20);
      
      // Cleanup should handle all expirations efficiently
      const cleanupStart = performance.now();
      cacheService.cleanup();
      const cleanupTime = performance.now() - cleanupStart;
      
      expect(cleanupTime).toBeLessThan(50); // Should be fast
      expect(cacheService.getStats().size).toBe(0);
    });
  });
});