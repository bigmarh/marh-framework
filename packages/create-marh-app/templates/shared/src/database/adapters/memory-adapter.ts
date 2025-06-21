/**
 * Memory Database Adapter
 * 
 * In-memory database implementation for development and testing.
 * Fast, simple, and perfect for prototyping applications.
 */

import { 
  BaseDatabaseAdapter, 
  BaseDatabase, 
  BaseTable, 
  BaseQueryBuilder 
} from './base-adapter';
import { 
  IDatabase, 
  ITable, 
  IQueryBuilder,
  DatabaseConfig, 
  TableSchema, 
  Migration,
  QueryResult,
  QueryContext
} from '../database.interface';
import { BaseEntity, QueryOptions, PaginatedResult } from '../../services/crud.interface';
import { MigrationManager } from '../migrations/migration-manager';

/**
 * Memory Query Builder
 */
class MemoryQueryBuilder<T extends BaseEntity> extends BaseQueryBuilder<T> {
  constructor(
    tableName: string,
    private table: MemoryTable<T>
  ) {
    super(tableName);
  }

  async first(): Promise<T | null> {
    const results = await this.get();
    return results[0] || null;
  }

  async get(): Promise<T[]> {
    let data = Array.from(this.table.data.values());
    
    // Apply filters
    data = this.applyFilters(data);
    
    // Apply sorting
    if (this._orderBy.length > 0) {
      data = this.applySort(data);
    }
    
    // Apply limit and offset
    if (this._offset) {
      data = data.slice(this._offset);
    }
    if (this._limit) {
      data = data.slice(0, this._limit);
    }
    
    // Apply field selection
    if (this._select && !this._select.includes('*')) {
      data = data.map(item => {
        const selected: any = {};
        this._select.forEach(field => {
          if (field in item) {
            selected[field] = (item as any)[field];
          }
        });
        return selected;
      });
    }
    
    return data;
  }

  async paginate(page: number, limit: number): Promise<PaginatedResult<T>> {
    const allData = await this.applyFiltersOnly();
    const total = allData.length;
    const offset = (page - 1) * limit;
    
    // Apply pagination
    this._offset = offset;
    this._limit = limit;
    
    const data = await this.get();
    
    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  async count(): Promise<number> {
    const data = await this.applyFiltersOnly();
    return data.length;
  }

  async update(updateData: Partial<T>): Promise<number> {
    const items = await this.applyFiltersOnly();
    let count = 0;
    
    for (const item of items) {
      const updated = {
        ...item,
        ...updateData,
        updatedAt: new Date()
      };
      this.table.data.set(item.id, updated as T);
      count++;
    }
    
    return count;
  }

  async delete(): Promise<number> {
    const items = await this.applyFiltersOnly();
    let count = 0;
    
    for (const item of items) {
      this.table.data.delete(item.id);
      count++;
    }
    
    return count;
  }

  toSql(): { query: string; bindings: any[] } {
    // Generate pseudo-SQL for debugging
    let query = `SELECT ${this._select.join(', ')} FROM ${this.tableName}`;\n    const bindings: any[] = [];\n    \n    if (this._where.length > 0) {\n      const whereClause = this._where.map(w => {\n        bindings.push(w.value);\n        return `${w.field} ${w.operator} ?`;\n      }).join(' AND ');\n      query += ` WHERE ${whereClause}`;\n    }\n    \n    if (this._orderBy.length > 0) {\n      const orderClause = this._orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ');\n      query += ` ORDER BY ${orderClause}`;\n    }\n    \n    if (this._limit) {\n      query += ` LIMIT ${this._limit}`;\n    }\n    \n    if (this._offset) {\n      query += ` OFFSET ${this._offset}`;\n    }\n    \n    return { query, bindings };\n  }\n\n  private async applyFiltersOnly(): Promise<T[]> {\n    let data = Array.from(this.table.data.values());\n    return this.applyFilters(data);\n  }\n\n  private applyFilters(data: T[]): T[] {\n    return data.filter(item => {\n      return this._where.every(condition => {\n        const itemValue = (item as any)[condition.field];\n        \n        switch (condition.operator) {\n          case '=':\n          case '==':\n            return itemValue === condition.value;\n          case '!=':\n          case '<>':\n            return itemValue !== condition.value;\n          case '>':\n            return itemValue > condition.value;\n          case '>=':\n            return itemValue >= condition.value;\n          case '<':\n            return itemValue < condition.value;\n          case '<=':\n            return itemValue <= condition.value;\n          case 'LIKE':\n            return String(itemValue).toLowerCase().includes(String(condition.value).toLowerCase());\n          case 'IN':\n            return Array.isArray(condition.value) && condition.value.includes(itemValue);\n          case 'BETWEEN':\n            return Array.isArray(condition.value) && \n                   itemValue >= condition.value[0] && \n                   itemValue <= condition.value[1];\n          case 'IS NULL':\n            return itemValue == null;\n          case 'IS NOT NULL':\n            return itemValue != null;\n          default:\n            return true;\n        }\n      });\n    });\n  }\n\n  private applySort(data: T[]): T[] {\n    return data.sort((a, b) => {\n      for (const sort of this._orderBy) {\n        const aValue = (a as any)[sort.field];\n        const bValue = (b as any)[sort.field];\n        \n        let comparison = 0;\n        if (aValue < bValue) comparison = -1;\n        else if (aValue > bValue) comparison = 1;\n        \n        if (comparison !== 0) {\n          return sort.direction === 'desc' ? -comparison : comparison;\n        }\n      }\n      return 0;\n    });\n  }\n}\n\n/**\n * Memory Table Implementation\n */\nclass MemoryTable<T extends BaseEntity> extends BaseTable<T> {\n  public data: Map<string | number, T> = new Map();\n  private idCounter = 1;\n\n  constructor(name: string, database: MemoryDatabase) {\n    super(name, database);\n  }\n\n  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {\n    const id = this.generateId();\n    const now = new Date();\n    \n    const entity = {\n      ...data,\n      id,\n      createdAt: now,\n      updatedAt: now\n    } as T;\n    \n    this.data.set(id, entity);\n    return entity;\n  }\n\n  async findById(id: string | number): Promise<T | null> {\n    return this.data.get(id) || null;\n  }\n\n  async findOne(filter: Partial<T>): Promise<T | null> {\n    for (const item of this.data.values()) {\n      const matches = Object.entries(filter).every(([key, value]) => {\n        return (item as any)[key] === value;\n      });\n      if (matches) {\n        return item;\n      }\n    }\n    return null;\n  }\n\n  async findMany(options?: QueryOptions): Promise<T[]> {\n    let items = Array.from(this.data.values());\n    \n    // Apply filter\n    if (options?.filter) {\n      items = items.filter(item => {\n        return Object.entries(options.filter!).every(([key, value]) => {\n          return (item as any)[key] === value;\n        });\n      });\n    }\n    \n    // Apply sort\n    if (options?.sort) {\n      items = items.sort((a, b) => {\n        const aValue = (a as any)[options.sort!.field];\n        const bValue = (b as any)[options.sort!.field];\n        \n        if (aValue < bValue) return options.sort!.direction === 'asc' ? -1 : 1;\n        if (aValue > bValue) return options.sort!.direction === 'asc' ? 1 : -1;\n        return 0;\n      });\n    }\n    \n    // Apply pagination\n    if (options?.pagination) {\n      const start = (options.pagination.page - 1) * options.pagination.limit;\n      const end = start + options.pagination.limit;\n      items = items.slice(start, end);\n    }\n    \n    return items;\n  }\n\n  async findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>> {\n    const allItems = await this.findMany({ \n      ...options, \n      pagination: undefined // Get all for count\n    });\n    \n    const pagination = options?.pagination || { page: 1, limit: allItems.length };\n    const start = (pagination.page - 1) * pagination.limit;\n    const data = allItems.slice(start, start + pagination.limit);\n    \n    return {\n      data,\n      total: allItems.length,\n      page: pagination.page,\n      limit: pagination.limit,\n      pages: Math.ceil(allItems.length / pagination.limit)\n    };\n  }\n\n  async update(id: string | number, updateData: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {\n    const existing = this.data.get(id);\n    if (!existing) {\n      throw new Error(`Record with id ${id} not found in table ${this.name}`);\n    }\n    \n    const updated = {\n      ...existing,\n      ...updateData,\n      updatedAt: new Date()\n    } as T;\n    \n    this.data.set(id, updated);\n    return updated;\n  }\n\n  async delete(id: string | number): Promise<boolean> {\n    return this.data.delete(id);\n  }\n\n  query(): IQueryBuilder<T> {\n    return new MemoryQueryBuilder(this.name, this);\n  }\n\n  async raw(sql: string, bindings?: any[]): Promise<QueryResult<T>> {\n    // Simple raw query simulation for memory adapter\n    console.warn('Raw SQL queries not supported in memory adapter:', sql);\n    return { rows: [], rowCount: 0, command: sql };\n  }\n\n  async truncate(): Promise<void> {\n    this.data.clear();\n    this.idCounter = 1;\n  }\n\n  async hasColumn(column: string): Promise<boolean> {\n    // Check if any record has this column\n    for (const item of this.data.values()) {\n      if (column in item) {\n        return true;\n      }\n    }\n    return false;\n  }\n\n  async distinct(field: string): Promise<any[]> {\n    const values = new Set();\n    for (const item of this.data.values()) {\n      const value = (item as any)[field];\n      if (value !== undefined) {\n        values.add(value);\n      }\n    }\n    return Array.from(values);\n  }\n\n  private generateId(): string {\n    return `mem_${this.idCounter++}_${Date.now()}`;\n  }\n}\n\n/**\n * Memory Database Implementation\n */\nclass MemoryDatabase extends BaseDatabase {\n  private tables: Map<string, MemoryTable<any>> = new Map();\n  private schemas: Map<string, TableSchema> = new Map();\n  private migrationManager: MigrationManager;\n\n  constructor(config: DatabaseConfig) {\n    super(config);\n    this.migrationManager = new MigrationManager(this);\n  }\n\n  async connect(): Promise<void> {\n    if (this._isConnected) return;\n    \n    console.log(`Connecting to memory database: ${this.config.name}`);\n    this._isConnected = true;\n    this.emit('connected', { config: this.config });\n  }\n\n  async disconnect(): Promise<void> {\n    if (!this._isConnected) return;\n    \n    console.log(`Disconnecting from memory database: ${this.config.name}`);\n    this._isConnected = false;\n    this.emit('disconnected', { config: this.config });\n  }\n\n  table<T extends BaseEntity>(name: string): ITable<T> {\n    if (!this.tables.has(name)) {\n      // Auto-create table if it doesn't exist\n      this.tables.set(name, new MemoryTable<T>(name, this));\n    }\n    return this.tables.get(name)!;\n  }\n\n  async hasTable(name: string): Promise<boolean> {\n    return this.tables.has(name) || this.schemas.has(name);\n  }\n\n  async createTable(schema: TableSchema): Promise<void> {\n    console.log(`Creating table: ${schema.name}`);\n    \n    const table = new MemoryTable(schema.name, this);\n    this.tables.set(schema.name, table);\n    this.schemas.set(schema.name, schema);\n  }\n\n  async dropTable(name: string): Promise<void> {\n    console.log(`Dropping table: ${name}`);\n    \n    this.tables.delete(name);\n    this.schemas.delete(name);\n  }\n\n  async getSchema(): Promise<TableSchema[]> {\n    return Array.from(this.schemas.values());\n  }\n\n  async migrate(migrations?: Migration[]): Promise<void> {\n    if (migrations) {\n      await this.migrationManager.migrate(migrations);\n    }\n  }\n\n  async rollback(steps?: number): Promise<void> {\n    await this.migrationManager.rollback(steps);\n  }\n\n  async getMigrationStatus(): Promise<Array<{ id: string; version: number; appliedAt: Date }>> {\n    return this.migrationManager.getStatus();\n  }\n\n  async raw<T = any>(query: string, bindings?: any[]): Promise<QueryResult<T>> {\n    const context = this.createQueryContext(query, bindings);\n    console.warn('Raw SQL not supported in memory adapter:', query);\n    \n    return { rows: [], rowCount: 0, command: query };\n  }\n\n  async backup(): Promise<string> {\n    const backup: any = {\n      version: 1,\n      timestamp: new Date().toISOString(),\n      schemas: Array.from(this.schemas.values()),\n      data: {}\n    };\n    \n    // Export all table data\n    for (const [tableName, table] of this.tables.entries()) {\n      backup.data[tableName] = Array.from(table.data.values());\n    }\n    \n    return JSON.stringify(backup, null, 2);\n  }\n\n  async restore(backupData: string): Promise<void> {\n    const backup = JSON.parse(backupData);\n    \n    // Clear existing data\n    this.tables.clear();\n    this.schemas.clear();\n    \n    // Restore schemas\n    for (const schema of backup.schemas) {\n      this.schemas.set(schema.name, schema);\n    }\n    \n    // Restore data\n    for (const [tableName, tableData] of Object.entries(backup.data)) {\n      const table = new MemoryTable(tableName, this);\n      \n      for (const record of tableData as any[]) {\n        table.data.set(record.id, record);\n      }\n      \n      this.tables.set(tableName, table);\n    }\n  }\n\n  async analyze(): Promise<{ tables: Array<{ name: string; rowCount: number; size: string }> }> {\n    const tables = [];\n    \n    for (const [name, table] of this.tables.entries()) {\n      const rowCount = table.data.size;\n      const sizeBytes = JSON.stringify(Array.from(table.data.values())).length;\n      const size = this.formatBytes(sizeBytes);\n      \n      tables.push({ name, rowCount, size });\n    }\n    \n    return { tables };\n  }\n\n  private formatBytes(bytes: number): string {\n    if (bytes === 0) return '0 B';\n    const k = 1024;\n    const sizes = ['B', 'KB', 'MB', 'GB'];\n    const i = Math.floor(Math.log(bytes) / Math.log(k));\n    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];\n  }\n}\n\n/**\n * Memory Database Adapter\n */\nexport class MemoryDatabaseAdapter extends BaseDatabaseAdapter {\n  constructor() {\n    super('memory', ['desktop', 'pwa', 'web']);\n  }\n\n  createDatabase(config: DatabaseConfig): IDatabase {\n    return new MemoryDatabase(config);\n  }\n\n  validateConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {\n    const result = super.validateConfig(config);\n    \n    if (config.type !== 'memory') {\n      result.errors.push('Invalid database type for memory adapter');\n    }\n    \n    return {\n      valid: result.errors.length === 0,\n      errors: result.errors\n    };\n  }\n\n  getDefaultConfig(): Partial<DatabaseConfig> {\n    return {\n      ...super.getDefaultConfig(),\n      autoMigrate: true,\n      debug: true\n    };\n  }\n}"