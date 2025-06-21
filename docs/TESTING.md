# Testing in MARH Framework

MARH Framework includes a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests. This ensures reliability, maintainability, and confidence in the framework's functionality.

## Testing Stack

- **Unit Tests**: [Vitest](https://vitest.dev/) - Fast, modern testing framework
- **Component Tests**: [Vitest](https://vitest.dev/) with [jsdom](https://github.com/jsdom/jsdom)
- **E2E Tests**: [Playwright](https://playwright.dev/) - Cross-browser automation
- **Coverage**: [V8 Coverage](https://vitest.dev/guide/coverage.html) - Built-in code coverage
- **CI/CD**: GitHub Actions with multi-node testing

## Quick Start

### Running Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test src/services/cache.service.test.ts
```

### Writing Your First Test

```typescript
// src/services/__tests__/my-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '../my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should create instance', () => {
    expect(service).toBeDefined();
  });

  it('should perform operation', async () => {
    const result = await service.doSomething('input');
    expect(result).toBe('expected-output');
  });
});
```

## Test Structure

### Test File Organization

```
src/
├── services/
│   ├── cache.service.ts
│   └── __tests__/
│       └── cache.service.test.ts
├── components/
│   ├── CacheDemo.tsx
│   └── __tests__/
│       └── CacheDemo.test.tsx
├── database/
│   ├── adapters/
│   │   ├── memory-adapter.ts
│   │   └── __tests__/
│   │       └── memory-adapter.test.ts
└── test/
    └── setup.ts          # Global test setup
```

### Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Test directories: `__tests__/` or `test/`
- E2E tests: `e2e/*.spec.ts`
- Test utils: `test/utils.ts` or `test/helpers.ts`

## Unit Testing

### Services Testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(10);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should cache values with TTL', () => {
    cacheService.set('key', 'value', 1000);
    expect(cacheService.has('key')).toBe(true);
    
    // Fast-forward time
    vi.advanceTimersByTime(1500);
    expect(cacheService.has('key')).toBe(false);
  });

  it('should handle async operations', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    
    const result = await cacheService.get('key', asyncFn, 1000);
    expect(result).toBe('result');
    expect(asyncFn).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    const result2 = await cacheService.get('key', asyncFn, 1000);
    expect(result2).toBe('result');
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });
});
```

### Store Testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../base.store';

interface TestState {
  count: number;
  name: string;
}

class TestStore extends Store<TestState> {
  constructor() {
    super({ count: 0, name: 'test' });
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }
}

describe('Store', () => {
  let store: TestStore;
  let mockRedraw: any;

  beforeEach(() => {
    mockRedraw = vi.fn();
    vi.doMock('@marh/core', () => ({ m: { redraw: mockRedraw } }));
    store = new TestStore();
  });

  it('should update state and trigger redraw', () => {
    store.increment();
    
    expect(store.state.count).toBe(1);
    expect(mockRedraw).toHaveBeenCalledTimes(1);
  });

  it('should maintain immutability', () => {
    const initialState = store.state;
    store.increment();
    
    expect(store.state).not.toBe(initialState);
    expect(initialState.count).toBe(0);
  });
});
```

### Database Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabaseAdapter } from '../adapters/memory-adapter';
import { DatabasePresets } from '../database-factory';

describe('MemoryDatabaseAdapter', () => {
  let adapter: MemoryDatabaseAdapter;
  let database: any;

  beforeEach(() => {
    adapter = new MemoryDatabaseAdapter();
    database = adapter.createDatabase(DatabasePresets.memory('test'));
  });

  it('should connect and create tables', async () => {
    await database.connect();
    expect(database.isConnected).toBe(true);
    
    const table = database.table('users');
    expect(table.name).toBe('users');
  });

  it('should perform CRUD operations', async () => {
    await database.connect();
    const table = database.table('users');
    
    const user = await table.create({
      name: 'John',
      email: 'john@example.com'
    });
    
    expect(user.id).toBeDefined();
    expect(user.name).toBe('John');
    
    const found = await table.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

## Component Testing

### Mithril Component Testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils } from '../../test/setup';
import { CacheDemo } from '../CacheDemo';

// Mock dependencies
const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  getStats: vi.fn(() => ({ size: 0, hits: 0, misses: 0 }))
};

vi.mock('../cache.service', () => ({
  cacheService: mockCacheService
}));

describe('CacheDemo Component', () => {
  let component: any;

  beforeEach(() => {
    component = TestUtils.createMockComponent(CacheDemo.view);
    if (CacheDemo.oninit) {
      CacheDemo.oninit.call(component);
    }
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    expect(component.keyInput).toBe('');
    expect(component.valueInput).toBe('');
    expect(component.loading).toBe(false);
  });

  it('should set cache values', async () => {
    component.keyInput = 'test-key';
    component.valueInput = 'test-value';
    
    await component.setCache();
    
    expect(mockCacheService.set).toHaveBeenCalledWith(
      'test-key',
      'test-value',
      expect.any(Number)
    );
  });
});
```

## Integration Testing

### Template Testing

```bash
# Test desktop template
npm run test:template desktop

# Test PWA template  
npm run test:template pwa

# Test with specific configuration
npm run test:template pwa --database=rest-api
```

### Cross-Platform Testing

```typescript
describe('Cross-Platform Compatibility', () => {
  it('should work on desktop', () => {
    // Mock desktop environment
    Object.defineProperty(window, 'electronAPI', { value: {} });
    
    const db = createDatabase({ type: 'auto', name: 'test' });
    expect(db.config.type).toBe('sqlite'); // Should choose SQLite
  });

  it('should work on PWA', () => {
    // Mock PWA environment
    Object.defineProperty(navigator, 'serviceWorker', { value: {} });
    Object.defineProperty(window, 'indexedDB', { value: {} });
    
    const db = createDatabase({ type: 'auto', name: 'test' });
    expect(db.config.type).toBe('indexeddb'); // Should choose IndexedDB
  });
});
```

## End-to-End Testing

### Basic E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('should load application', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MARH/);
  await expect(page.locator('h1')).toContainText('Welcome');
});

test('should perform cache operations', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to cache demo
  const cacheDemo = page.locator('[data-testid="cache-demo"]');
  await cacheDemo.scrollIntoViewIfNeeded();
  
  // Set cache value
  await page.fill('[data-testid="cache-key"]', 'test-key');
  await page.fill('[data-testid="cache-value"]', 'test-value');
  await page.click('[data-testid="cache-set"]');
  
  // Verify success
  await expect(page.locator('[data-testid="cache-output"]'))
    .toContainText('Cache set successfully');
});
```

### Cross-Browser Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
});
```

## Test Utilities

### Custom Test Utilities

```typescript
// test/utils.ts
export const TestUtils = {
  // Wait helpers
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock helpers
  mockFetchSuccess: (data: any) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data)
    });
  },
  
  // Test data factories
  createTestUser: (overrides = {}) => ({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }),
  
  // Component helpers
  createMockComponent: (view: Function) => ({
    view,
    oninit: vi.fn(),
    onupdate: vi.fn(),
    onremove: vi.fn()
  })
};
```

### Custom Matchers

```typescript
// test/setup.ts
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => `expected ${received} to be within ${floor}-${ceiling}`,
      pass
    };
  }
});

// Usage in tests
expect(performance.now()).toBeWithinRange(0, 1000);
```

## Coverage and Quality

### Coverage Thresholds

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Test Quality Metrics

- **Coverage**: Minimum 80% across all metrics
- **Performance**: Tests complete in under 5 seconds
- **Reliability**: Tests pass consistently (no flaky tests)
- **Maintainability**: Clear, readable test descriptions

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 21.x]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Quality Gates

Tests must pass these gates before merging:

1. **Unit Tests**: All tests pass with 80%+ coverage
2. **Integration Tests**: Template generation and building works
3. **E2E Tests**: Core user journeys work across browsers
4. **Performance**: No significant performance regressions
5. **Security**: No new security vulnerabilities

## Best Practices

### Writing Good Tests

```typescript
// ✅ Good: Descriptive test names
test('should cache API responses for 5 minutes', () => {});

// ❌ Bad: Vague test names  
test('should work', () => {});

// ✅ Good: Test one thing at a time
test('should increment counter', () => {});
test('should reset counter to zero', () => {});

// ❌ Bad: Testing multiple things
test('should increment and reset counter', () => {});

// ✅ Good: Clear arrange, act, assert
test('should format currency correctly', () => {
  // Arrange
  const amount = 1234.56;
  
  // Act
  const result = formatCurrency(amount);
  
  // Assert
  expect(result).toBe('$1,234.56');
});
```

### Test Organization

1. **Group related tests** with `describe` blocks
2. **Use `beforeEach`** for common setup
3. **Keep tests independent** - no shared state
4. **Mock external dependencies** appropriately
5. **Test edge cases** and error conditions

### Performance Testing

```typescript
test('should handle large datasets efficiently', () => {
  const largeData = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    data: `item-${i}`
  }));
  
  const startTime = performance.now();
  const result = processLargeData(largeData);
  const duration = performance.now() - startTime;
  
  expect(result).toHaveLength(10000);
  expect(duration).toBeLessThan(100); // Should complete in under 100ms
});
```

## Debugging Tests

### Debug Commands

```bash
# Run single test file
npm run test cache.service.test.ts

# Run tests matching pattern
npm run test -- --grep "cache operations"

# Run tests in debug mode
npm run test:debug

# Open Vitest UI for interactive debugging
npm run test:ui
```

### Common Issues

1. **Async Tests**: Use `async/await` properly
2. **Timers**: Use `vi.useFakeTimers()` for time-dependent tests
3. **Mocks**: Clear mocks between tests with `vi.clearAllMocks()`
4. **DOM**: Use `jsdom` environment for DOM-dependent tests

The MARH testing strategy ensures that every component, service, and feature is thoroughly tested across multiple environments and use cases, providing confidence in the framework's reliability and maintainability.