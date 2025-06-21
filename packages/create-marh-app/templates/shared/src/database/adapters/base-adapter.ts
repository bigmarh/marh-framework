/**
 * Base Database Adapter
 * 
 * Provides a foundation for implementing database adapters.
 * Each adapter (SQLite, REST API, IndexedDB, etc.) extends this class.
 */

import { 
  IDatabaseAdapter, 
  IDatabase, 
  ITable, 
  ITransaction,
  IQueryBuilder,
  DatabaseConfig, 
  TableSchema, 
  Migration, 
  QueryResult,
  QueryContext,
  DatabaseError,
  ConnectionError,
  QueryError,
  ValidationError,
  DatabaseEvents
} from '../database.interface';
import { BaseEntity, QueryOptions, PaginatedResult } from '../../services/crud.interface';

/**
 * Event emitter for database events
 */
class DatabaseEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

/**
 * Base Query Builder implementation
 */
export abstract class BaseQueryBuilder<T extends BaseEntity> implements IQueryBuilder<T> {
  protected _select: string[] = ['*'];
  protected _where: Array<{ field: string; operator: string; value: any; connector: 'AND' | 'OR' }> = [];
  protected _orderBy: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  protected _groupBy: string[] = [];
  protected _having: Array<{ field: string; operator: string; value: any }> = [];
  protected _limit?: number;
  protected _offset?: number;
  protected _joins: Array<{ table: string; leftKey: string; rightKey: string; type: string }> = [];

  constructor(protected tableName: string) {}

  select(fields?: string[]): IQueryBuilder<T> {
    if (fields) {
      this._select = fields;
    }
    return this;
  }

  where(field: string, operator: string, value: any): IQueryBuilder<T> {
    this._where.push({ field, operator, value, connector: 'AND' });
    return this;
  }

  whereIn(field: string, values: any[]): IQueryBuilder<T> {
    return this.where(field, 'IN', values);
  }

  whereBetween(field: string, min: any, max: any): IQueryBuilder<T> {
    this._where.push({ field, operator: 'BETWEEN', value: [min, max], connector: 'AND' });
    return this;
  }

  whereNull(field: string): IQueryBuilder<T> {
    return this.where(field, 'IS NULL', null);
  }

  whereNotNull(field: string): IQueryBuilder<T> {
    return this.where(field, 'IS NOT NULL', null);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): IQueryBuilder<T> {
    this._orderBy.push({ field, direction });
    return this;
  }

  groupBy(fields: string[]): IQueryBuilder<T> {
    this._groupBy = fields;
    return this;
  }

  having(field: string, operator: string, value: any): IQueryBuilder<T> {
    this._having.push({ field, operator, value });
    return this;
  }

  limit(limit: number): IQueryBuilder<T> {
    this._limit = limit;
    return this;
  }

  offset(offset: number): IQueryBuilder<T> {
    this._offset = offset;
    return this;
  }

  join(table: string, leftKey: string, rightKey: string, type: 'inner' | 'left' | 'right' = 'inner'): IQueryBuilder<T> {
    this._joins.push({ table, leftKey, rightKey, type });
    return this;
  }

  // Abstract methods to be implemented by specific adapters
  abstract first(): Promise<T | null>;
  abstract get(): Promise<T[]>;
  abstract paginate(page: number, limit: number): Promise<PaginatedResult<T>>;
  abstract count(): Promise<number>;
  abstract update(data: Partial<T>): Promise<number>;
  abstract delete(): Promise<number>;
  abstract toSql(): { query: string; bindings: any[] };
}

/**
 * Base Table implementation
 */
export abstract class BaseTable<T extends BaseEntity> implements ITable<T> {
  constructor(
    public readonly name: string,
    protected database: BaseDatabase
  ) {}

  // Abstract methods that adapters must implement
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract findById(id: string | number): Promise<T | null>;
  abstract findOne(filter: Partial<T>): Promise<T | null>;
  abstract findMany(options?: QueryOptions): Promise<T[]>;
  abstract findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract update(id: string | number, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T>;
  abstract delete(id: string | number): Promise<boolean>;
  abstract query(): IQueryBuilder<T>;
  abstract raw(sql: string, bindings?: any[]): Promise<QueryResult<T>>;

  // Default implementations for CRUD interface methods
  async createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<any> {
    const results: any = { successful: [], failed: [], total: data.length, successCount: 0, failureCount: 0 };
    
    for (const item of data) {
      try {
        const created = await this.create(item);
        results.successful.push(created);
        results.successCount++;
      } catch (error: any) {
        results.failed.push({ item, error: error.message });
        results.failureCount++;
      }
    }
    
    return results;
  }

  async updateMany(filter: Partial<T>, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
    return this.query().where('id', 'IN', 
      (await this.findMany({ filter })).map(item => item.id)
    ).update(data as Partial<T>);
  }

  async deleteMany(filter: Partial<T>): Promise<number> {
    return this.query().where('id', 'IN', 
      (await this.findMany({ filter })).map(item => item.id)
    ).delete();
  }

  async count(filter?: Partial<T>): Promise<number> {
    let builder = this.query();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        builder = builder.where(key, '=', value);
      });
    }
    return builder.count();
  }

  async exists(filter: Partial<T>): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }

  async upsert(filter: Partial<T>, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const existing = await this.findOne(filter);
    if (existing) {
      return this.update(existing.id, data);
    } else {
      return this.create(data);
    }
  }

  async validate(data: Partial<T>): Promise<any> {
    // Override in specific implementations
    return { success: true, data };
  }

  // Database-specific methods with default implementations
  async insert(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]> {
    const results = await this.createMany(data);
    return results.successful;
  }

  async truncate(): Promise<void> {
    await this.raw(`DELETE FROM ${this.name}`);
  }

  async hasColumn(column: string): Promise<boolean> {
    // Override in specific implementations
    throw new Error('hasColumn not implemented');
  }

  async addColumn(column: string, definition: any): Promise<void> {
    // Override in specific implementations
    throw new Error('addColumn not implemented');
  }

  async dropColumn(column: string): Promise<void> {
    // Override in specific implementations
    throw new Error('dropColumn not implemented');
  }

  async createIndex(name: string, fields: string[], unique?: boolean): Promise<void> {
    // Override in specific implementations
    throw new Error('createIndex not implemented');
  }

  async dropIndex(name: string): Promise<void> {
    // Override in specific implementations
    throw new Error('dropIndex not implemented');
  }

  async aggregate(operations: Array<{ function: string; field: string }>): Promise<Record<string, number>> {
    // Override in specific implementations
    throw new Error('aggregate not implemented');
  }

  async distinct(field: string): Promise<any[]> {
    // Override in specific implementations
    throw new Error('distinct not implemented');
  }

  async pluck(field: string): Promise<any[]> {
    const results = await this.query().select([field]).get();
    return results.map(row => (row as any)[field]);
  }
}

/**
 * Base Database implementation
 */
export abstract class BaseDatabase implements IDatabase {
  protected eventEmitter = new DatabaseEventEmitter();
  protected _isConnected = false;
  protected tables: Map<string, BaseTable<any>> = new Map();

  constructor(public readonly config: DatabaseConfig) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  // Abstract methods that adapters must implement
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract table<T extends BaseEntity>(name: string): ITable<T>;
  abstract hasTable(name: string): Promise<boolean>;
  abstract createTable(schema: TableSchema): Promise<void>;
  abstract dropTable(name: string): Promise<void>;
  abstract raw<T = any>(query: string, bindings?: any[]): Promise<QueryResult<T>>;

  // Default implementations
  async getSchema(): Promise<TableSchema[]> {
    // Override in specific implementations
    throw new Error('getSchema not implemented');
  }

  async validateSchema(schema: TableSchema): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!schema.name) {
      errors.push('Table name is required');
    }
    
    if (!schema.fields || Object.keys(schema.fields).length === 0) {
      errors.push('At least one field is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  async migrate(migrations?: Migration[]): Promise<void> {
    // Override in specific implementations
    throw new Error('migrate not implemented');
  }

  async rollback(steps?: number): Promise<void> {
    // Override in specific implementations
    throw new Error('rollback not implemented');
  }

  async getMigrationStatus(): Promise<Array<{ id: string; version: number; appliedAt: Date }>> {
    // Override in specific implementations
    throw new Error('getMigrationStatus not implemented');
  }

  async transaction<T>(callback: (trx: ITransaction) => Promise<T>): Promise<T> {
    // Override in specific implementations
    throw new Error('transaction not implemented');
  }

  async backup(): Promise<string> {
    // Override in specific implementations
    throw new Error('backup not implemented');
  }

  async restore(backupData: string): Promise<void> {
    // Override in specific implementations
    throw new Error('restore not implemented');
  }

  async vacuum(): Promise<void> {
    // Override in specific implementations
    console.log('vacuum not implemented for this adapter');
  }

  async analyze(): Promise<{ tables: Array<{ name: string; rowCount: number; size: string }> }> {
    // Override in specific implementations
    throw new Error('analyze not implemented');
  }

  // Event system
  on(event: string, callback: Function): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: Function): void {
    this.eventEmitter.off(event, callback);
  }

  protected emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }

  async destroy(): Promise<void> {
    if (this._isConnected) {
      await this.disconnect();
    }
    this.tables.clear();
  }

  // Helper methods
  protected createQueryContext(query: string, bindings: any[] = [], table?: string, operation?: string): QueryContext {
    return {
      query,
      bindings,
      table,
      operation: operation as any || 'select',
      startTime: Date.now()
    };
  }

  protected handleError(error: Error, context?: QueryContext): never {
    this.emit('error', { error, context });
    throw error;
  }
}

/**
 * Base Database Adapter
 */
export abstract class BaseDatabaseAdapter implements IDatabaseAdapter {
  constructor(
    public readonly name: string,
    public readonly supportedPlatforms: Array<'desktop' | 'pwa' | 'web'>
  ) {}

  abstract createDatabase(config: DatabaseConfig): IDatabase;

  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.type) {
      errors.push('Database type is required');
    }
    
    if (!config.name) {
      errors.push('Database name is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): Partial<DatabaseConfig> {
    return {
      autoMigrate: true,
      debug: false
    };
  }
}