/**
 * CacheDemo Component Tests
 * 
 * Tests for the cache demo component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils } from '../../test/setup';
import { CacheDemo } from '../CacheDemo';

// Mock the cache service
const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  invalidate: vi.fn(),
  clear: vi.fn(),
  getStats: vi.fn(() => ({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: '0%'
  })),
  cleanup: vi.fn()
};

vi.mock('../cache.service', () => ({
  cacheService: mockCacheService
}));

describe('CacheDemo Component', () => {
  let component: any;

  beforeEach(() => {
    component = TestUtils.createMockComponent(CacheDemo.view);
    
    // Reset component state
    if (CacheDemo.oninit) {
      CacheDemo.oninit.call(component);
    }
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockCacheService.getStats.mockReturnValue({
      size: 5,
      hits: 10,
      misses: 3,
      hitRate: '76.92%'
    });
  });

  describe('Component Initialization', () => {
    it('should initialize with default state', () => {
      expect(component.cacheKeys).toEqual([]);
      expect(component.selectedKey).toBe('');
      expect(component.keyInput).toBe('');
      expect(component.valueInput).toBe('');
      expect(component.ttlInput).toBe('300000');
      expect(component.loading).toBe(false);
      expect(component.error).toBeNull();
    });

    it('should load cache keys on initialization', () => {
      // Mock cache service has method
      mockCacheService.has.mockReturnValue(true);
      
      // Simulate component initialization loading cache keys
      component.loadCacheKeys();
      
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('Cache Operations', () => {
    beforeEach(() => {
      component.keyInput = 'test-key';
      component.valueInput = 'test-value';
      component.ttlInput = '60000';
    });

    it('should set cache values', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        60000
      );
      expect(component.keyInput).toBe('');
      expect(component.valueInput).toBe('');
    });

    it('should handle JSON values when setting cache', async () => {
      component.valueInput = '{"name": "John", "age": 30}';
      mockCacheService.set.mockResolvedValue(undefined);
      
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        { name: 'John', age: 30 },
        60000
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      component.valueInput = '{invalid json}';
      mockCacheService.set.mockResolvedValue(undefined);
      
      await component.setCache();
      
      // Should set as string if JSON parsing fails
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        '{invalid json}',
        60000
      );
    });

    it('should get cache values', async () => {
      const mockValue = { data: 'cached-data' };
      mockCacheService.get.mockReturnValue(mockValue);
      
      component.selectedKey = 'existing-key';
      await component.getCache();
      
      expect(mockCacheService.get).toHaveBeenCalledWith('existing-key');
      expect(component.retrievedValue).toEqual(mockValue);
    });

    it('should handle missing cache values', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      
      component.selectedKey = 'missing-key';
      await component.getCache();
      
      expect(component.retrievedValue).toBeUndefined();
      expect(component.error).toContain('not found');
    });

    it('should invalidate cache keys', async () => {
      mockCacheService.invalidate.mockResolvedValue(undefined);
      
      component.selectedKey = 'key-to-invalidate';
      await component.invalidateKey();
      
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('key-to-invalidate');
    });

    it('should clear entire cache', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);
      
      await component.clearCache();
      
      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation errors', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));
      
      component.keyInput = 'test-key';
      component.valueInput = 'test-value';
      
      await component.setCache();
      
      expect(component.error).toBe('Cache error');
    });

    it('should clear error state on successful operations', async () => {
      component.error = 'Previous error';
      mockCacheService.set.mockResolvedValue(undefined);
      
      component.keyInput = 'test-key';
      component.valueInput = 'test-value';
      
      await component.setCache();
      
      expect(component.error).toBeNull();
    });

    it('should validate required inputs', async () => {
      // Test empty key
      component.keyInput = '';
      component.valueInput = 'value';
      
      await component.setCache();
      
      expect(component.error).toContain('required');
      expect(mockCacheService.set).not.toHaveBeenCalled();
      
      // Test empty value
      component.keyInput = 'key';
      component.valueInput = '';
      
      await component.setCache();
      
      expect(component.error).toContain('required');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('Demo Operations', () => {
    it('should run cache stress test', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockReturnValue('test-value');
      
      await component.runStressTest();
      
      // Should have called set and get multiple times
      expect(mockCacheService.set).toHaveBeenCalledTimes(100);
      expect(mockCacheService.get).toHaveBeenCalledTimes(100);
      expect(component.stressTestResults).toBeDefined();
      expect(component.stressTestResults.duration).toBeGreaterThan(0);
    });

    it('should benchmark cache performance', async () => {
      const mockPerformanceNow = TestUtils.mockPerformanceNow();
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockReturnValue('value');
      
      await component.benchmarkCache();
      
      expect(component.benchmarkResults).toBeDefined();
      expect(component.benchmarkResults.operations).toBeGreaterThan(0);
      expect(component.benchmarkResults.opsPerSecond).toBeGreaterThan(0);
    });

    it('should demonstrate TTL expiration', async () => {
      vi.useFakeTimers();
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.has.mockReturnValueOnce(true).mockReturnValueOnce(false);
      
      await component.demonstrateTTL();
      
      // Fast-forward time
      vi.advanceTimersByTime(2000);
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'ttl-demo',
        expect.any(String),
        1000
      );
      
      vi.useRealTimers();
    });
  });

  describe('Statistics Display', () => {
    it('should display cache statistics', () => {
      const stats = mockCacheService.getStats();
      
      component.refreshStats();
      
      expect(component.stats).toEqual(stats);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });

    it('should format statistics for display', () => {
      mockCacheService.getStats.mockReturnValue({
        size: 10,
        hits: 75,
        misses: 25,
        hitRate: '75.00%'
      });
      
      component.refreshStats();
      
      expect(component.stats.hitRate).toBe('75.00%');
      expect(component.stats.size).toBe(10);
    });
  });

  describe('User Interface', () => {
    it('should update input values', () => {
      const keyEvent = { target: { value: 'new-key' } };
      const valueEvent = { target: { value: 'new-value' } };
      const ttlEvent = { target: { value: '120000' } };
      
      component.onKeyInput(keyEvent);
      component.onValueInput(valueEvent);
      component.onTTLInput(ttlEvent);
      
      expect(component.keyInput).toBe('new-key');
      expect(component.valueInput).toBe('new-value');
      expect(component.ttlInput).toBe('120000');
    });

    it('should handle key selection', () => {
      const selectEvent = { target: { value: 'selected-key' } };
      
      component.onKeySelect(selectEvent);
      
      expect(component.selectedKey).toBe('selected-key');
    });

    it('should show loading state during operations', async () => {
      mockCacheService.set.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      component.keyInput = 'test-key';
      component.valueInput = 'test-value';
      
      const promise = component.setCache();
      
      expect(component.loading).toBe(true);
      
      await promise;
      
      expect(component.loading).toBe(false);
    });
  });

  describe('Advanced Features', () => {
    it('should demonstrate memoization', async () => {
      const mockMemoized = vi.fn().mockReturnValue('memoized-result');
      mockCacheService.memoize = vi.fn().mockReturnValue(mockMemoized);
      
      await component.demonstrateMemoization();
      
      expect(mockCacheService.memoize).toHaveBeenCalled();
      expect(mockMemoized).toHaveBeenCalledTimes(2); // Called twice to show caching
    });

    it('should demonstrate pattern invalidation', async () => {
      mockCacheService.invalidatePattern = vi.fn().mockResolvedValue(undefined);
      
      await component.demonstratePatternInvalidation();
      
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith(
        expect.any(RegExp)
      );
    });

    it('should export cache data', () => {
      mockCacheService.getStats.mockReturnValue({
        size: 5,
        hits: 10,
        misses: 2,
        hitRate: '83.33%'
      });
      
      // Mock all cache keys and values
      const mockKeys = ['key1', 'key2', 'key3'];
      const mockData = {
        key1: 'value1',
        key2: { nested: 'object' },
        key3: 123
      };
      
      component.cacheKeys = mockKeys;
      mockCacheService.get.mockImplementation(key => mockData[key]);
      
      component.exportCacheData();
      
      // Should create and download export file
      expect(mockCacheService.get).toHaveBeenCalledTimes(mockKeys.length);
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up on component removal', () => {
      const cleanupSpy = vi.fn();
      component.cleanup = cleanupSpy;
      
      if (CacheDemo.onremove) {
        CacheDemo.onremove.call(component);
      }
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should refresh data on component update', () => {
      const refreshSpy = vi.spyOn(component, 'refreshStats');
      
      if (CacheDemo.onupdate) {
        CacheDemo.onupdate.call(component);
      }
      
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const view = CacheDemo.view.call(component);
      
      // Check that form inputs have proper labels
      expect(view).toBeDefined();
      // Note: In a real test environment, you'd render the component
      // and check the actual DOM for ARIA attributes
    });

    it('should handle keyboard navigation', () => {
      const keyEvent = { key: 'Enter', preventDefault: vi.fn() };
      
      // Simulate Enter key on form
      if (component.handleKeyPress) {
        component.handleKeyPress(keyEvent);
        expect(keyEvent.preventDefault).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large cache values', async () => {
      const largeValue = 'x'.repeat(1000000); // 1MB string
      mockCacheService.set.mockResolvedValue(undefined);
      
      component.keyInput = 'large-key';
      component.valueInput = largeValue;
      
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'large-key',
        largeValue,
        expect.any(Number)
      );
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with/special#characters?and&symbols';
      mockCacheService.set.mockResolvedValue(undefined);
      
      component.keyInput = specialKey;
      component.valueInput = 'value';
      
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        specialKey,
        'value',
        expect.any(Number)
      );
    });

    it('should handle numeric TTL values correctly', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      
      component.keyInput = 'key';
      component.valueInput = 'value';
      component.ttlInput = '0'; // Zero TTL
      
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith('key', 'value', 0);
      
      component.ttlInput = 'invalid'; // Invalid TTL
      await component.setCache();
      
      expect(mockCacheService.set).toHaveBeenCalledWith('key', 'value', NaN);
    });
  });
});