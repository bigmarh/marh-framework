/**
 * Test Setup for MARH Framework
 * 
 * Configures the test environment and provides common test utilities.
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Mock DOM APIs that might not be available in test environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'fetch', {
  value: vi.fn(),
  writable: true,
});

// Mock navigator APIs
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      ready: Promise.resolve({
        sync: { register: vi.fn() }
      })
    }
  },
  writable: true,
});

// Mock Mithril redraw
const mockRedraw = vi.fn();
vi.mock('@marh/core', async () => {
  const actual = await vi.importActual('@marh/core');
  return {
    ...actual,
    m: {
      ...actual.m,
      redraw: mockRedraw,
    },
  };
});

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset localStorage
  window.localStorage.clear();
  
  // Reset navigator.onLine
  Object.defineProperty(window.navigator, 'onLine', {
    value: true,
    writable: true,
  });
});

afterEach(() => {
  // Clean up any timers or async operations
  vi.clearAllTimers();
  vi.restoreAllMocks();
});

// Test utilities
export const TestUtils = {
  /**
   * Wait for next tick
   */
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  /**
   * Wait for specified time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock successful fetch response
   */
  mockFetchSuccess: (data: any, status = 200) => {
    (window.fetch as any).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  },

  /**
   * Mock failed fetch response
   */
  mockFetchError: (error: string, status = 500) => {
    (window.fetch as any).mockRejectedValue(new Error(error));
  },

  /**
   * Mock network offline
   */
  mockOffline: () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
    });
    window.dispatchEvent(new Event('offline'));
  },

  /**
   * Mock network online
   */
  mockOnline: () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
    });
    window.dispatchEvent(new Event('online'));
  },

  /**
   * Create mock localStorage
   */
  createMockStorage: () => {
    const storage = new Map<string, string>();
    return {
      getItem: vi.fn((key: string) => storage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
      get size() { return storage.size; },
      get keys() { return Array.from(storage.keys()); }
    };
  },

  /**
   * Create test entity for database tests
   */
  createTestUser: (overrides: any = {}) => ({
    id: 'test-user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  /**
   * Create test post entity
   */
  createTestPost: (overrides: any = {}) => ({
    id: 'test-post-1',
    title: 'Test Post',
    content: 'This is a test post content',
    authorId: 'test-user-1',
    status: 'draft' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  /**
   * Assert that function was called with specific arguments
   */
  assertCalledWith: (fn: any, ...args: any[]) => {
    expect(fn).toHaveBeenCalledWith(...args);
  },

  /**
   * Assert that function was called n times
   */
  assertCalledTimes: (fn: any, times: number) => {
    expect(fn).toHaveBeenCalledTimes(times);
  },

  /**
   * Create mock component for testing
   */
  createMockComponent: (view: () => any) => ({
    view,
    oninit: vi.fn(),
    onbeforeupdate: vi.fn(),
    onupdate: vi.fn(),
    onbeforeremove: vi.fn(),
    onremove: vi.fn(),
  }),

  /**
   * Mock performance.now for timing tests
   */
  mockPerformanceNow: (startTime = 0) => {
    let time = startTime;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 1;
      return time;
    });
    return () => time;
  }
};

// Global test constants
export const TEST_CONSTANTS = {
  CACHE_TTL: 1000, // 1 second for faster tests
  TEST_TIMEOUT: 5000, // 5 seconds max per test
  MOCK_API_URL: 'https://api.test.com',
  TEST_DB_NAME: 'test-database',
};

// Custom matchers for testing
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithObjectContaining(received: any, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call: any[]) => 
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => arg[key] === expected[key])
      )
    );

    if (pass) {
      return {
        message: () => `expected function not to have been called with object containing ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to have been called with object containing ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeWithinRange(floor: number, ceiling: number): T;
      toHaveBeenCalledWithObjectContaining(expected: any): T;
    }
  }
}