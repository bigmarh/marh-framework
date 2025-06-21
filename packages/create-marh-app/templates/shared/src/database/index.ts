/**
 * MARH Database System
 * 
 * Unified database interface with pluggable adapters for different backends.
 * 
 * Example usage:
 * 
 * ```typescript
 * import { createDatabase, DatabasePresets } from './database';
 * 
 * // Create an in-memory database for development
 * const db = createDatabase(DatabasePresets.memory('my-app'));
 * 
 * // Create a REST API database for production
 * const db = createDatabase(DatabasePresets.restAPI('my-app', 'https://api.example.com'));
 * 
 * // Use the database
 * await db.connect();
 * const usersTable = db.table<User>('users');
 * const user = await usersTable.create({ name: 'John', email: 'john@example.com' });
 * ```
 */

// Core interfaces and types
export * from './database.interface';

// Factory and configuration
export * from './database-factory';

// Migration system
export * from './migrations/migration-manager';

// Base classes for creating custom adapters
export * from './adapters/base-adapter';

// Built-in adapters
export { MemoryDatabaseAdapter } from './adapters/memory-adapter';
export { RestApiDatabaseAdapter } from './adapters/rest-api-adapter';

// Factory instance and convenience functions
import { 
  databaseFactory, 
  createDatabase as createDatabaseInstance,
  registerDatabaseAdapter,
  DatabaseConfigBuilder,
  DatabasePresets
} from './database-factory';
import { MemoryDatabaseAdapter } from './adapters/memory-adapter';
import { RestApiDatabaseAdapter } from './adapters/rest-api-adapter';

// Register built-in adapters
databaseFactory.registerAdapter(new MemoryDatabaseAdapter());
databaseFactory.registerAdapter(new RestApiDatabaseAdapter());

// Re-export factory functions
export { createDatabaseInstance as createDatabase, registerDatabaseAdapter, DatabaseConfigBuilder, DatabasePresets };

// Export the factory instance for advanced usage
export { databaseFactory };

/**
 * Quick start functions for common use cases
 */
export const Database = {
  /**
   * Create memory database for development/testing
   */
  memory: (name: string) => {
    const db = createDatabaseInstance(DatabasePresets.memory(name));
    return db;
  },

  /**
   * Create REST API database for production
   */
  restAPI: (name: string, baseUrl: string, headers?: Record<string, string>) => {
    const config = DatabasePresets.restAPI(name, baseUrl);
    if (headers) {
      config.options = { ...config.options, headers };
    }
    return createDatabaseInstance(config);
  },

  /**
   * Create database with custom configuration
   */
  create: createDatabaseInstance,

  /**
   * Get available database types for current platform
   */
  getAvailableTypes: () => databaseFactory.getSupportedTypes(),

  /**
   * Get configuration template for a database type
   */
  getConfigTemplate: (type: string) => databaseFactory.getConfigTemplate(type)
};

/**
 * Schema builder helpers
 */
export const Schema = {
  /**
   * Create a new table schema
   */
  table: (name: string) => new TableSchemaBuilder(name),

  /**
   * Common field types
   */
  fields: {
    id: () => ({ type: 'string' as const, required: true, unique: true }),
    uuid: () => ({ type: 'string' as const, required: true, unique: true }),
    string: (maxLength?: number) => ({ 
      type: 'string' as const, 
      required: true,
      ...(maxLength && { maxLength })
    }),
    text: () => ({ type: 'text' as const }),
    number: (min?: number, max?: number) => ({ 
      type: 'number' as const, 
      required: true,
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max })
    }),
    boolean: (defaultValue?: boolean) => ({ 
      type: 'boolean' as const, 
      required: true,
      ...(defaultValue !== undefined && { default: defaultValue })
    }),
    date: () => ({ type: 'date' as const, required: true }),
    json: () => ({ type: 'json' as const }),
    enum: (values: string[], defaultValue?: string) => ({
      type: 'string' as const,
      required: true,
      enum: values,
      ...(defaultValue && { default: defaultValue })
    }),
    email: () => ({
      type: 'string' as const,
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255
    }),
    timestamps: () => ({
      createdAt: { type: 'date' as const, required: true },
      updatedAt: { type: 'date' as const, required: true }
    })
  }
};

/**
 * Table schema builder
 */
class TableSchemaBuilder {
  private schema: any = {
    name: '',
    fields: {},
    indexes: [],
    relations: []
  };

  constructor(name: string) {
    this.schema.name = name;
  }

  /**
   * Add a field to the table
   */
  field(name: string, definition: any): TableSchemaBuilder {
    this.schema.fields[name] = definition;
    return this;
  }

  /**
   * Add multiple fields at once
   */
  fields(fields: Record<string, any>): TableSchemaBuilder {
    this.schema.fields = { ...this.schema.fields, ...fields };
    return this;
  }

  /**
   * Set primary key
   */
  primaryKey(field: string): TableSchemaBuilder {
    this.schema.primaryKey = field;
    return this;
  }

  /**
   * Add an index
   */
  index(name: string, fields: string[], unique = false): TableSchemaBuilder {
    this.schema.indexes.push({ name, fields, unique });
    return this;
  }

  /**
   * Add timestamps (createdAt, updatedAt)
   */
  timestamps(): TableSchemaBuilder {
    return this.fields(Schema.fields.timestamps());
  }

  /**
   * Build the schema
   */
  build() {
    return this.schema;
  }
}

/**
 * Common database patterns and utilities
 */
export const DatabaseUtils = {
  /**
   * Generate a UUID v4
   */
  generateUUID: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Generate a timestamp-based ID
   */
  generateTimestampId: (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Sanitize string for database storage
   */
  sanitizeString: (str: string): string => {
    return str.trim().replace(/[<>]/g, '');
  },

  /**
   * Format date for database storage
   */
  formatDate: (date: Date): string => {
    return date.toISOString();
  },

  /**
   * Parse date from database
   */
  parseDate: (dateStr: string): Date => {
    return new Date(dateStr);
  }
};

/**
 * Database event constants
 */
export const DatabaseEvents = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  QUERY: 'query',
  MIGRATION: 'migration'
} as const;