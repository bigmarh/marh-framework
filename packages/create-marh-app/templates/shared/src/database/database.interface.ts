/**
 * Core Database Interface for MARH Framework
 * 
 * Provides a unified interface for different database backends:
 * - SQLite (Desktop)
 * - REST API (Any platform)
 * - IndexedDB (PWA)
 * - In-Memory (Testing/Development)
 */

import { ICrudService, BaseEntity, QueryOptions, PaginatedResult, BatchResult } from '../services/crud.interface';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database adapter type */
  type: 'sqlite' | 'rest-api' | 'indexeddb' | 'memory';
  /** Database name/identifier */
  name: string;
  /** Connection options (adapter-specific) */
  options?: Record<string, any>;
  /** Enable automatic migrations */
  autoMigrate?: boolean;
  /** Migration directory path */
  migrationsPath?: string;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Database schema field definition
 */
export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text';
  required?: boolean;
  unique?: boolean;
  default?: any;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  pattern?: RegExp;
  index?: boolean;
}

/**
 * Database table schema
 */
export interface TableSchema {
  name: string;
  fields: Record<string, SchemaField>;
  primaryKey?: string;
  indexes?: Array<{
    name: string;
    fields: string[];
    unique?: boolean;
  }>;
  relations?: Array<{
    type: 'hasMany' | 'belongsTo' | 'manyToMany';
    table: string;
    foreignKey?: string;
    localKey?: string;
    pivotTable?: string;
  }>;
}

/**
 * Database migration
 */
export interface Migration {
  id: string;
  version: number;
  description: string;
  up: (db: IDatabase) => Promise<void>;
  down: (db: IDatabase) => Promise<void>;
}

/**
 * Transaction interface
 */
export interface ITransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  table<T extends BaseEntity>(name: string): ITable<T>;
}

/**
 * Raw query result
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
}

/**
 * Advanced query builder interface
 */
export interface IQueryBuilder<T extends BaseEntity> {
  select(fields?: string[]): IQueryBuilder<T>;
  where(field: string, operator: string, value: any): IQueryBuilder<T>;
  whereIn(field: string, values: any[]): IQueryBuilder<T>;
  whereBetween(field: string, min: any, max: any): IQueryBuilder<T>;
  whereNull(field: string): IQueryBuilder<T>;
  whereNotNull(field: string): IQueryBuilder<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): IQueryBuilder<T>;
  groupBy(fields: string[]): IQueryBuilder<T>;
  having(field: string, operator: string, value: any): IQueryBuilder<T>;
  limit(limit: number): IQueryBuilder<T>;
  offset(offset: number): IQueryBuilder<T>;
  join(table: string, leftKey: string, rightKey: string, type?: 'inner' | 'left' | 'right'): IQueryBuilder<T>;
  first(): Promise<T | null>;
  get(): Promise<T[]>;
  paginate(page: number, limit: number): Promise<PaginatedResult<T>>;
  count(): Promise<number>;
  update(data: Partial<T>): Promise<number>;
  delete(): Promise<number>;
  toSql(): { query: string; bindings: any[] };
}

/**
 * Table interface - extends CRUD with database-specific operations
 */
export interface ITable<T extends BaseEntity> extends ICrudService<T> {
  /** Table name */
  readonly name: string;

  // Enhanced query methods
  query(): IQueryBuilder<T>;
  raw(sql: string, bindings?: any[]): Promise<QueryResult<T>>;
  
  // Bulk operations
  insert(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]>;
  truncate(): Promise<void>;
  
  // Schema operations  
  hasColumn(column: string): Promise<boolean>;
  addColumn(column: string, definition: SchemaField): Promise<void>;
  dropColumn(column: string): Promise<void>;
  
  // Index operations
  createIndex(name: string, fields: string[], unique?: boolean): Promise<void>;
  dropIndex(name: string): Promise<void>;
  
  // Advanced features
  aggregate(operations: Array<{ function: 'sum' | 'avg' | 'min' | 'max' | 'count'; field: string }>): Promise<Record<string, number>>;
  distinct(field: string): Promise<any[]>;
  pluck(field: string): Promise<any[]>;
}

/**
 * Main database interface
 */
export interface IDatabase {
  /** Database configuration */
  readonly config: DatabaseConfig;
  
  /** Connection status */
  readonly isConnected: boolean;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Table operations
  table<T extends BaseEntity>(name: string): ITable<T>;
  hasTable(name: string): Promise<boolean>;
  createTable(schema: TableSchema): Promise<void>;
  dropTable(name: string): Promise<void>;
  
  // Schema management
  getSchema(): Promise<TableSchema[]>;
  validateSchema(schema: TableSchema): Promise<{ valid: boolean; errors: string[] }>;
  
  // Migration management  
  migrate(migrations?: Migration[]): Promise<void>;
  rollback(steps?: number): Promise<void>;
  getMigrationStatus(): Promise<Array<{ id: string; version: number; appliedAt: Date }>>;
  
  // Transaction support
  transaction<T>(callback: (trx: ITransaction) => Promise<T>): Promise<T>;
  
  // Raw operations
  raw<T = any>(query: string, bindings?: any[]): Promise<QueryResult<T>>;
  
  // Utility methods
  backup(): Promise<string>;
  restore(backupData: string): Promise<void>;
  vacuum(): Promise<void>;
  analyze(): Promise<{ tables: Array<{ name: string; rowCount: number; size: string }> }>;
  
  // Event system
  on(event: 'connected' | 'disconnected' | 'error' | 'query', callback: Function): void;
  off(event: string, callback: Function): void;
  
  // Cleanup
  destroy(): Promise<void>;
}

/**
 * Database adapter interface - implement this for new database types
 */
export interface IDatabaseAdapter {
  /** Adapter name */
  readonly name: string;
  
  /** Supported platforms */
  readonly supportedPlatforms: Array<'desktop' | 'pwa' | 'web'>;
  
  /** Create database instance */
  createDatabase(config: DatabaseConfig): IDatabase;
  
  /** Validate configuration */
  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] };
  
  /** Get default configuration */
  getDefaultConfig(): Partial<DatabaseConfig>;
}

/**
 * Database factory interface
 */
export interface IDatabaseFactory {
  /** Register a database adapter */
  registerAdapter(adapter: IDatabaseAdapter): void;
  
  /** Create database instance */
  create(config: DatabaseConfig): IDatabase;
  
  /** Get available adapters */
  getAdapters(): IDatabaseAdapter[];
  
  /** Get adapter by type */
  getAdapter(type: string): IDatabaseAdapter | undefined;
}

/**
 * Query execution context
 */
export interface QueryContext {
  query: string;
  bindings: any[];
  table?: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'schema';
  startTime: number;
}

/**
 * Database events
 */
export interface DatabaseEvents {
  connected: { config: DatabaseConfig };
  disconnected: { config: DatabaseConfig };
  error: { error: Error; context?: QueryContext };
  query: { context: QueryContext; duration: number; result?: any };
  migration: { migration: Migration; direction: 'up' | 'down' };
}

/**
 * Common database errors
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: QueryContext
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, context?: QueryContext) {
    super(message, 'CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, context?: QueryContext) {
    super(message, 'QUERY_ERROR', context);
    this.name = 'QueryError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, context?: QueryContext) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class MigrationError extends DatabaseError {
  constructor(message: string, context?: QueryContext) {
    super(message, 'MIGRATION_ERROR', context);
    this.name = 'MigrationError';
  }
}