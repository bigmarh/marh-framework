/**
 * Database Factory
 * 
 * Central factory for creating database instances with different adapters.
 * Handles adapter registration and configuration validation.
 */

import { 
  IDatabaseFactory, 
  IDatabaseAdapter, 
  IDatabase, 
  DatabaseConfig,
  DatabaseError 
} from './database.interface';

/**
 * Database Factory Implementation
 */
export class DatabaseFactory implements IDatabaseFactory {
  private adapters: Map<string, IDatabaseAdapter> = new Map();
  private instances: Map<string, IDatabase> = new Map();

  constructor() {
    // Register built-in adapters when they're imported
  }

  /**
   * Register a database adapter
   */
  registerAdapter(adapter: IDatabaseAdapter): void {
    if (this.adapters.has(adapter.name)) {
      console.warn(`Adapter '${adapter.name}' is already registered. Overwriting...`);
    }
    
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Create database instance
   */
  create(config: DatabaseConfig): IDatabase {
    // Validate config
    if (!config.type) {
      throw new DatabaseError('Database type is required', 'INVALID_CONFIG');
    }

    if (!config.name) {
      throw new DatabaseError('Database name is required', 'INVALID_CONFIG');
    }

    // Get adapter
    const adapter = this.adapters.get(config.type);
    if (!adapter) {
      throw new DatabaseError(
        `No adapter found for database type '${config.type}'. Available types: ${Array.from(this.adapters.keys()).join(', ')}`,
        'ADAPTER_NOT_FOUND'
      );
    }

    // Validate adapter-specific config
    const validation = adapter.validateConfig(config);
    if (!validation.valid) {
      throw new DatabaseError(
        `Invalid configuration: ${validation.errors.join(', ')}`,
        'INVALID_CONFIG'
      );
    }

    // Check platform compatibility
    const currentPlatform = this.detectPlatform();
    if (!adapter.supportedPlatforms.includes(currentPlatform)) {
      throw new DatabaseError(
        `Adapter '${adapter.name}' does not support platform '${currentPlatform}'. Supported platforms: ${adapter.supportedPlatforms.join(', ')}`,
        'PLATFORM_NOT_SUPPORTED'
      );
    }

    // Merge with default config
    const finalConfig = {
      ...adapter.getDefaultConfig(),
      ...config
    };

    // Create instance key for caching
    const instanceKey = `${config.type}:${config.name}`;
    
    // Return existing instance if available
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!;
    }

    // Create new instance
    const database = adapter.createDatabase(finalConfig);
    this.instances.set(instanceKey, database);
    
    return database;
  }

  /**
   * Get available adapters
   */
  getAdapters(): IDatabaseAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapter by type
   */
  getAdapter(type: string): IDatabaseAdapter | undefined {
    return this.adapters.get(type);
  }

  /**
   * Get supported database types for current platform
   */
  getSupportedTypes(): string[] {
    const currentPlatform = this.detectPlatform();
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.supportedPlatforms.includes(currentPlatform))
      .map(adapter => adapter.name);
  }

  /**
   * Clear cached instances
   */
  clearCache(): void {
    this.instances.clear();
  }

  /**
   * Destroy all cached instances
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.instances.values()).map(db => 
      db.destroy().catch(error => console.error('Error destroying database:', error))
    );
    
    await Promise.all(destroyPromises);
    this.instances.clear();
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): 'desktop' | 'pwa' | 'web' {
    if (typeof window !== 'undefined') {
      // Check for Electron
      if ((window as any).electronAPI || (window as any).require) {
        return 'desktop';
      }
      
      // Check for PWA features
      if ('serviceWorker' in navigator && 'indexedDB' in window) {
        return 'pwa';
      }
      
      return 'web';
    }
    
    // Default to web for SSR/Node environments
    return 'web';
  }

  /**
   * Get configuration template for adapter type
   */
  getConfigTemplate(type: string): Partial<DatabaseConfig> | null {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      return null;
    }

    return {
      type: type as any,
      name: 'my-database',
      ...adapter.getDefaultConfig(),
      options: this.getAdapterConfigOptions(type)
    };
  }

  /**
   * Get adapter-specific configuration options
   */
  private getAdapterConfigOptions(type: string): Record<string, any> {
    switch (type) {
      case 'sqlite':
        return {
          path: './database.sqlite',
          readonly: false,
          timeout: 5000
        };
      
      case 'rest-api':
        return {
          baseUrl: 'https://api.example.com',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          retries: 3
        };
      
      case 'indexeddb':
        return {
          version: 1,
          storeName: 'data',
          keyPath: 'id'
        };
      
      case 'memory':
        return {
          persist: false,
          maxSize: 1000
        };
      
      default:
        return {};
    }
  }
}

// Export singleton instance
export const databaseFactory = new DatabaseFactory();

/**
 * Convenience function to create database
 */
export function createDatabase(config: DatabaseConfig): IDatabase {
  return databaseFactory.create(config);
}

/**
 * Convenience function to register adapter
 */
export function registerDatabaseAdapter(adapter: IDatabaseAdapter): void {
  databaseFactory.registerAdapter(adapter);
}

/**
 * Database configuration builder
 */
export class DatabaseConfigBuilder {
  private config: Partial<DatabaseConfig> = {};

  static create(): DatabaseConfigBuilder {
    return new DatabaseConfigBuilder();
  }

  type(type: 'sqlite' | 'rest-api' | 'indexeddb' | 'memory'): DatabaseConfigBuilder {
    this.config.type = type;
    return this;
  }

  name(name: string): DatabaseConfigBuilder {
    this.config.name = name;
    return this;
  }

  options(options: Record<string, any>): DatabaseConfigBuilder {
    this.config.options = { ...this.config.options, ...options };
    return this;
  }

  autoMigrate(enabled: boolean = true): DatabaseConfigBuilder {
    this.config.autoMigrate = enabled;
    return this;
  }

  debug(enabled: boolean = true): DatabaseConfigBuilder {
    this.config.debug = enabled;
    return this;
  }

  migrationsPath(path: string): DatabaseConfigBuilder {
    this.config.migrationsPath = path;
    return this;
  }

  build(): DatabaseConfig {
    if (!this.config.type) {
      throw new Error('Database type is required');
    }
    if (!this.config.name) {
      throw new Error('Database name is required');
    }
    
    return this.config as DatabaseConfig;
  }
}

/**
 * Database configuration presets
 */
export const DatabasePresets = {
  /**
   * SQLite for desktop development
   */
  sqliteDesktop: (name: string, path?: string): DatabaseConfig => ({
    type: 'sqlite',
    name,
    autoMigrate: true,
    debug: true,
    options: {
      path: path || `./data/${name}.sqlite`,
      timeout: 5000
    }
  }),

  /**
   * IndexedDB for PWA
   */
  indexedDbPWA: (name: string): DatabaseConfig => ({
    type: 'indexeddb',
    name,
    autoMigrate: true,
    debug: false,
    options: {
      version: 1,
      storeName: 'data'
    }
  }),

  /**
   * REST API backend
   */
  restAPI: (name: string, baseUrl: string): DatabaseConfig => ({
    type: 'rest-api',
    name,
    autoMigrate: false,
    debug: false,
    options: {
      baseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      retries: 3
    }
  }),

  /**
   * In-memory for testing
   */
  memory: (name: string): DatabaseConfig => ({
    type: 'memory',
    name,
    autoMigrate: false,
    debug: true,
    options: {
      persist: false,
      maxSize: 1000
    }
  })
};