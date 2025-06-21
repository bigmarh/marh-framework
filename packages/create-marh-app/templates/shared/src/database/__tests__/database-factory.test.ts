/**
 * Database Factory Tests
 * 
 * Tests for the database factory and configuration system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils, TEST_CONSTANTS } from '../../test/setup';
import { 
  DatabaseFactory, 
  databaseFactory, 
  DatabaseConfigBuilder, 
  DatabasePresets,
  createDatabase,
  registerDatabaseAdapter
} from '../database-factory';
import { MemoryDatabaseAdapter } from '../adapters/memory-adapter';
import { RestApiDatabaseAdapter } from '../adapters/rest-api-adapter';
import { DatabaseError } from '../database.interface';

describe('DatabaseFactory', () => {
  let factory: DatabaseFactory;

  beforeEach(() => {
    factory = new DatabaseFactory();
    // Register built-in adapters
    factory.registerAdapter(new MemoryDatabaseAdapter());
    factory.registerAdapter(new RestApiDatabaseAdapter());
  });

  describe('Adapter Registration', () => {
    it('should register adapters', () => {
      const customAdapter = {
        name: 'custom',
        supportedPlatforms: ['web'],
        createDatabase: vi.fn(),
        validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
        getDefaultConfig: vi.fn(() => ({}))
      };

      factory.registerAdapter(customAdapter as any);
      
      const adapters = factory.getAdapters();
      expect(adapters.some(a => a.name === 'custom')).toBe(true);
    });

    it('should warn when overwriting existing adapter', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const duplicateAdapter = {
        name: 'memory',
        supportedPlatforms: ['web'],
        createDatabase: vi.fn(),
        validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
        getDefaultConfig: vi.fn(() => ({}))
      };

      factory.registerAdapter(duplicateAdapter as any);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Adapter 'memory' is already registered")
      );
      
      consoleSpy.mockRestore();
    });

    it('should get adapter by type', () => {
      const memoryAdapter = factory.getAdapter('memory');
      const restApiAdapter = factory.getAdapter('rest-api');
      const nonExistentAdapter = factory.getAdapter('nonexistent');

      expect(memoryAdapter).toBeDefined();
      expect(memoryAdapter?.name).toBe('memory');
      expect(restApiAdapter).toBeDefined();
      expect(restApiAdapter?.name).toBe('rest-api');
      expect(nonExistentAdapter).toBeUndefined();
    });
  });

  describe('Database Creation', () => {
    it('should create memory database', () => {
      const config = {
        type: 'memory' as const,
        name: 'test-db',
        autoMigrate: true
      };

      const database = factory.create(config);
      
      expect(database).toBeDefined();
      expect(database.config.type).toBe('memory');
      expect(database.config.name).toBe('test-db');
    });

    it('should create REST API database', () => {
      const config = {
        type: 'rest-api' as const,
        name: 'api-db',
        options: {
          baseUrl: 'https://api.example.com'
        }
      };

      const database = factory.create(config);
      
      expect(database).toBeDefined();
      expect(database.config.type).toBe('rest-api');
      expect(database.config.options?.baseUrl).toBe('https://api.example.com');
    });

    it('should merge with default configuration', () => {
      const config = {
        type: 'memory' as const,
        name: 'test-db'
      };

      const database = factory.create(config);
      
      // Should have default values from adapter
      expect(database.config.autoMigrate).toBe(true);
      expect(database.config.debug).toBe(true);
    });

    it('should cache database instances', () => {
      const config = {
        type: 'memory' as const,
        name: 'test-db'
      };

      const db1 = factory.create(config);
      const db2 = factory.create(config);
      
      expect(db1).toBe(db2); // Should be same instance
    });

    it('should create different instances for different configs', () => {
      const config1 = {
        type: 'memory' as const,
        name: 'db1'
      };

      const config2 = {
        type: 'memory' as const,
        name: 'db2'
      };

      const db1 = factory.create(config1);
      const db2 = factory.create(config2);
      
      expect(db1).not.toBe(db2);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required fields', () => {
      expect(() => {
        factory.create({} as any);
      }).toThrow(DatabaseError);

      expect(() => {
        factory.create({ type: 'memory' } as any);
      }).toThrow(DatabaseError);
    });

    it('should validate adapter existence', () => {
      expect(() => {
        factory.create({
          type: 'nonexistent' as any,
          name: 'test'
        });
      }).toThrow(DatabaseError);
    });

    it('should validate adapter-specific configuration', () => {
      expect(() => {
        factory.create({
          type: 'rest-api',
          name: 'test',
          options: {} // Missing baseUrl
        });
      }).toThrow(DatabaseError);
    });

    it('should validate platform compatibility', () => {
      // Mock platform detection to return unsupported platform
      const originalDetectPlatform = (factory as any).detectPlatform;
      (factory as any).detectPlatform = () => 'unsupported-platform';

      const limitedAdapter = {
        name: 'limited',
        supportedPlatforms: ['specific-platform'],
        createDatabase: vi.fn(),
        validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
        getDefaultConfig: vi.fn(() => ({}))
      };

      factory.registerAdapter(limitedAdapter as any);

      expect(() => {
        factory.create({
          type: 'limited' as any,
          name: 'test'
        });
      }).toThrow(DatabaseError);

      // Restore original method
      (factory as any).detectPlatform = originalDetectPlatform;
    });
  });

  describe('Platform Detection', () => {
    it('should detect desktop platform', () => {
      // Mock Electron environment
      (global as any).window = {
        electronAPI: true
      };

      const platform = (factory as any).detectPlatform();
      expect(platform).toBe('desktop');

      delete (global as any).window;
    });

    it('should detect PWA platform', () => {
      // Mock PWA environment
      (global as any).window = {};
      (global as any).navigator = {
        serviceWorker: {}
      };
      (global as any).indexedDB = {};

      const platform = (factory as any).detectPlatform();
      expect(platform).toBe('pwa');

      delete (global as any).window;
      delete (global as any).navigator;
      delete (global as any).indexedDB;
    });

    it('should default to web platform', () => {
      const platform = (factory as any).detectPlatform();
      expect(platform).toBe('web');
    });
  });

  describe('Supported Types', () => {
    it('should return supported types for current platform', () => {
      const supportedTypes = factory.getSupportedTypes();
      
      expect(supportedTypes).toContain('memory');
      expect(supportedTypes).toContain('rest-api');
    });

    it('should filter types by platform', () => {
      const desktopOnlyAdapter = {
        name: 'desktop-only',
        supportedPlatforms: ['desktop'],
        createDatabase: vi.fn(),
        validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
        getDefaultConfig: vi.fn(() => ({}))
      };

      factory.registerAdapter(desktopOnlyAdapter as any);

      // Mock current platform as web
      const originalDetectPlatform = (factory as any).detectPlatform;
      (factory as any).detectPlatform = () => 'web';

      const supportedTypes = factory.getSupportedTypes();
      expect(supportedTypes).not.toContain('desktop-only');

      // Restore
      (factory as any).detectPlatform = originalDetectPlatform;
    });
  });

  describe('Configuration Templates', () => {
    it('should provide configuration templates', () => {
      const memoryTemplate = factory.getConfigTemplate('memory');
      const restApiTemplate = factory.getConfigTemplate('rest-api');
      const invalidTemplate = factory.getConfigTemplate('invalid');

      expect(memoryTemplate).toBeDefined();
      expect(memoryTemplate?.type).toBe('memory');
      expect(memoryTemplate?.name).toBe('my-database');

      expect(restApiTemplate).toBeDefined();
      expect(restApiTemplate?.type).toBe('rest-api');
      expect(restApiTemplate?.options?.baseUrl).toBe('https://api.example.com');

      expect(invalidTemplate).toBeNull();
    });

    it('should include adapter-specific options', () => {
      const restApiTemplate = factory.getConfigTemplate('rest-api');
      
      expect(restApiTemplate?.options).toHaveProperty('baseUrl');
      expect(restApiTemplate?.options).toHaveProperty('headers');
      expect(restApiTemplate?.options).toHaveProperty('timeout');
      expect(restApiTemplate?.options).toHaveProperty('retries');
    });
  });

  describe('Cache Management', () => {
    it('should clear cached instances', () => {
      const config = {
        type: 'memory' as const,
        name: 'test-db'
      };

      const db1 = factory.create(config);
      factory.clearCache();
      const db2 = factory.create(config);
      
      expect(db1).not.toBe(db2);
    });

    it('should destroy all instances', async () => {
      const config1 = { type: 'memory' as const, name: 'db1' };
      const config2 = { type: 'memory' as const, name: 'db2' };

      const db1 = factory.create(config1);
      const db2 = factory.create(config2);

      const destroySpy1 = vi.spyOn(db1, 'destroy').mockResolvedValue();
      const destroySpy2 = vi.spyOn(db2, 'destroy').mockResolvedValue();

      await factory.destroyAll();

      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
    });

    it('should handle destroy errors gracefully', async () => {
      const config = { type: 'memory' as const, name: 'test-db' };
      const db = factory.create(config);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(db, 'destroy').mockRejectedValue(new Error('Destroy failed'));

      await expect(factory.destroyAll()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('DatabaseConfigBuilder', () => {
  it('should build valid configuration', () => {
    const config = DatabaseConfigBuilder.create()
      .type('memory')
      .name('test-db')
      .autoMigrate(true)
      .debug(false)
      .options({ maxSize: 100 })
      .build();

    expect(config).toEqual({
      type: 'memory',
      name: 'test-db',
      autoMigrate: true,
      debug: false,
      options: { maxSize: 100 }
    });
  });

  it('should require type and name', () => {
    expect(() => {
      DatabaseConfigBuilder.create().build();
    }).toThrow('Database type is required');

    expect(() => {
      DatabaseConfigBuilder.create()
        .type('memory')
        .build();
    }).toThrow('Database name is required');
  });

  it('should merge options', () => {
    const config = DatabaseConfigBuilder.create()
      .type('memory')
      .name('test-db')
      .options({ option1: 'value1' })
      .options({ option2: 'value2' })
      .build();

    expect(config.options).toEqual({
      option1: 'value1',
      option2: 'value2'
    });
  });

  it('should set migrations path', () => {
    const config = DatabaseConfigBuilder.create()
      .type('memory')
      .name('test-db')
      .migrationsPath('./migrations')
      .build();

    expect(config.migrationsPath).toBe('./migrations');
  });
});

describe('DatabasePresets', () => {
  it('should create memory preset', () => {
    const config = DatabasePresets.memory('test-app');

    expect(config.type).toBe('memory');
    expect(config.name).toBe('test-app');
    expect(config.autoMigrate).toBe(false);
    expect(config.debug).toBe(true);
  });

  it('should create SQLite preset', () => {
    const config = DatabasePresets.sqliteDesktop('test-app', './custom.sqlite');

    expect(config.type).toBe('sqlite');
    expect(config.name).toBe('test-app');
    expect(config.options?.path).toBe('./custom.sqlite');
  });

  it('should create IndexedDB preset', () => {
    const config = DatabasePresets.indexedDbPWA('test-app');

    expect(config.type).toBe('indexeddb');
    expect(config.name).toBe('test-app');
    expect(config.options?.version).toBe(1);
  });

  it('should create REST API preset', () => {
    const config = DatabasePresets.restAPI('test-app', 'https://api.test.com');

    expect(config.type).toBe('rest-api');
    expect(config.name).toBe('test-app');
    expect(config.options?.baseUrl).toBe('https://api.test.com');
    expect(config.options?.timeout).toBe(10000);
  });
});

describe('Global Factory Functions', () => {
  it('should create database with global function', () => {
    const config = DatabasePresets.memory('test-app');
    const database = createDatabase(config);

    expect(database).toBeDefined();
    expect(database.config.type).toBe('memory');
  });

  it('should register adapter with global function', () => {
    const customAdapter = {
      name: 'test-adapter',
      supportedPlatforms: ['web'],
      createDatabase: vi.fn(),
      validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
      getDefaultConfig: vi.fn(() => ({}))
    };

    registerDatabaseAdapter(customAdapter as any);

    const adapters = databaseFactory.getAdapters();
    expect(adapters.some(a => a.name === 'test-adapter')).toBe(true);
  });
});

describe('Singleton Factory', () => {
  it('should have built-in adapters registered', () => {
    const adapters = databaseFactory.getAdapters();
    
    expect(adapters.some(a => a.name === 'memory')).toBe(true);
    expect(adapters.some(a => a.name === 'rest-api')).toBe(true);
  });

  it('should create databases', () => {
    const config = DatabasePresets.memory('singleton-test');
    const database = databaseFactory.create(config);

    expect(database).toBeDefined();
    expect(database.config.name).toBe('singleton-test');
  });
});