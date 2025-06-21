/**
 * Base CRUD Service Interface
 * 
 * Provides a consistent API for Create, Read, Update, Delete operations
 * across different data sources and platforms.
 */

/**
 * Query options for filtering, sorting, and pagination
 */
export interface QueryOptions {
  /** Filter criteria */
  filter?: Record<string, any>;
  /** Sort field and direction */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
  };
  /** Include related data */
  include?: string[];
  /** Select specific fields */
  fields?: string[];
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string | number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * CRUD operation results
 */
export interface CrudResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: Partial<T>;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

/**
 * Change event for real-time updates
 */
export interface ChangeEvent<T> {
  type: 'created' | 'updated' | 'deleted';
  entity: T;
  timestamp: Date;
  source?: string;
}

/**
 * Base CRUD Service Interface
 */
export interface ICrudService<T extends BaseEntity> {
  // ============ Core CRUD Operations ============

  /**
   * Create a new entity
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;

  /**
   * Read a single entity by ID
   */
  findById(id: string | number): Promise<T | null>;

  /**
   * Read a single entity by criteria
   */
  findOne(filter: Partial<T>): Promise<T | null>;

  /**
   * Read multiple entities
   */
  findMany(options?: QueryOptions): Promise<T[]>;

  /**
   * Read with pagination
   */
  findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>>;

  /**
   * Update an entity
   */
  update(id: string | number, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: string | number): Promise<boolean>;

  // ============ Batch Operations ============

  /**
   * Create multiple entities
   */
  createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BatchResult<T>>;

  /**
   * Update multiple entities
   */
  updateMany(
    filter: Partial<T>, 
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<number>;

  /**
   * Delete multiple entities
   */
  deleteMany(filter: Partial<T>): Promise<number>;

  // ============ Advanced Operations ============

  /**
   * Count entities matching criteria
   */
  count(filter?: Partial<T>): Promise<number>;

  /**
   * Check if entity exists
   */
  exists(filter: Partial<T>): Promise<boolean>;

  /**
   * Upsert - create or update based on criteria
   */
  upsert(
    filter: Partial<T>,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T>;

  // ============ Validation ============

  /**
   * Validate entity data
   */
  validate(data: Partial<T>): Promise<CrudResult<T>>;

  // ============ Real-time (Optional) ============

  /**
   * Subscribe to changes (optional)
   */
  subscribe?(callback: (event: ChangeEvent<T>) => void): () => void;

  /**
   * Sync with remote source (optional)
   */
  sync?(): Promise<void>;
}

/**
 * CRUD Service configuration
 */
export interface CrudConfig {
  /** Entity name for logging/debugging */
  entityName: string;
  /** Enable caching */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable optimistic updates */
  optimistic?: boolean;
  /** Enable soft deletes */
  softDelete?: boolean;
  /** Custom ID generator */
  generateId?: () => string | number;
  /** Validation rules */
  validationRules?: Record<string, any>;
}

/**
 * Abstract base class for CRUD services
 */
export abstract class BaseCrudService<T extends BaseEntity> implements ICrudService<T> {
  protected config: CrudConfig;

  constructor(config: CrudConfig) {
    this.config = {
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      optimistic: false,
      softDelete: false,
      generateId: () => Date.now().toString(),
      ...config
    };
  }

  // Abstract methods that must be implemented by subclasses
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract findById(id: string | number): Promise<T | null>;
  abstract findOne(filter: Partial<T>): Promise<T | null>;
  abstract findMany(options?: QueryOptions): Promise<T[]>;
  abstract findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract update(id: string | number, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T>;
  abstract delete(id: string | number): Promise<boolean>;

  // Default implementations for batch operations
  async createMany(data: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BatchResult<T>> {
    const result: BatchResult<T> = {
      successful: [],
      failed: [],
      total: data.length,
      successCount: 0,
      failureCount: 0
    };

    for (const item of data) {
      try {
        const created = await this.create(item);
        result.successful.push(created);
        result.successCount++;
      } catch (error: any) {
        result.failed.push({
          item: item as Partial<T>,
          error: error.message || 'Unknown error'
        });
        result.failureCount++;
      }
    }

    return result;
  }

  async updateMany(filter: Partial<T>, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
    const items = await this.findMany({ filter });
    let count = 0;

    for (const item of items) {
      try {
        await this.update(item.id, data);
        count++;
      } catch (error) {
        console.error(`Failed to update item ${item.id}:`, error);
      }
    }

    return count;
  }

  async deleteMany(filter: Partial<T>): Promise<number> {
    const items = await this.findMany({ filter });
    let count = 0;

    for (const item of items) {
      try {
        await this.delete(item.id);
        count++;
      } catch (error) {
        console.error(`Failed to delete item ${item.id}:`, error);
      }
    }

    return count;
  }

  async count(filter?: Partial<T>): Promise<number> {
    const items = await this.findMany({ filter });
    return items.length;
  }

  async exists(filter: Partial<T>): Promise<boolean> {
    const item = await this.findOne(filter);
    return item !== null;
  }

  async upsert(filter: Partial<T>, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const existing = await this.findOne(filter);
    
    if (existing) {
      return this.update(existing.id, data);
    } else {
      return this.create(data);
    }
  }

  async validate(data: Partial<T>): Promise<CrudResult<T>> {
    // Override in subclasses for custom validation
    return {
      success: true,
      data: data as T
    };
  }

  // Helper methods
  protected generateId(): string | number {
    return this.config.generateId!();
  }

  protected addTimestamps<K extends Partial<T>>(data: K, isUpdate = false): K {
    const now = new Date().toISOString();
    
    if (!isUpdate) {
      (data as any).createdAt = now;
    }
    (data as any).updatedAt = now;
    
    return data;
  }

  protected applyFilter(items: T[], filter?: Record<string, any>): T[] {
    if (!filter) return items;

    return items.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined) return true;
        
        const itemValue = (item as any)[key];
        
        // Handle different filter types
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        } else if (typeof value === 'object' && value !== null) {
          // Handle range queries { $gte: 10, $lte: 20 }
          if ('$gte' in value && itemValue < value.$gte) return false;
          if ('$gt' in value && itemValue <= value.$gt) return false;
          if ('$lte' in value && itemValue > value.$lte) return false;
          if ('$lt' in value && itemValue >= value.$lt) return false;
          if ('$ne' in value && itemValue === value.$ne) return false;
          return true;
        } else {
          return itemValue === value;
        }
      });
    });
  }

  protected applySort(items: T[], sort?: { field: string; direction: 'asc' | 'desc' }): T[] {
    if (!sort) return items;

    return [...items].sort((a, b) => {
      const aValue = (a as any)[sort.field];
      const bValue = (b as any)[sort.field];

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  protected applyPagination(
    items: T[], 
    pagination?: { page: number; limit: number }
  ): { items: T[]; total: number; pages: number } {
    if (!pagination) {
      return {
        items,
        total: items.length,
        pages: 1
      };
    }

    const { page, limit } = pagination;
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return {
      items: paginatedItems,
      total: items.length,
      pages: Math.ceil(items.length / limit)
    };
  }
}