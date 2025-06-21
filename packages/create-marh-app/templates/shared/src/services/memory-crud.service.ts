import { BaseCrudService, BaseEntity, QueryOptions, PaginatedResult, CrudConfig } from './crud.interface';
import { cacheService } from './cache.service';

/**
 * In-Memory CRUD Service
 * 
 * A simple in-memory implementation of the CRUD interface.
 * Useful for prototyping, testing, and client-side data management.
 * 
 * Features:
 * - Full CRUD operations in memory
 * - Optional caching integration
 * - Query filtering and sorting
 * - Pagination support
 * - Change notifications
 */
export class MemoryCrudService<T extends BaseEntity> extends BaseCrudService<T> {
  protected data: Map<string | number, T> = new Map();
  private subscribers: Array<(event: any) => void> = [];

  constructor(config: CrudConfig) {
    super(config);
  }

  // ============ Core CRUD Operations ============

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const id = this.generateId();
    const entity = {
      ...data,
      id,
      ...this.addTimestamps({})
    } as T;

    this.data.set(id, entity);
    
    // Clear cache
    if (this.config.cache) {
      this.invalidateCache();
    }

    // Notify subscribers
    this.notifyChange('created', entity);

    return entity;
  }

  async findById(id: string | number): Promise<T | null> {
    if (this.config.cache) {
      return cacheService.get(
        `${this.config.entityName}:${id}`,
        async () => this.data.get(id) || null,
        this.config.cacheTTL
      );
    }

    return this.data.get(id) || null;
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const items = await this.findMany({ filter });
    return items[0] || null;
  }

  async findMany(options: QueryOptions = {}): Promise<T[]> {
    let items = Array.from(this.data.values());

    // Apply filter
    if (options.filter) {
      items = this.applyFilter(items, options.filter);
    }

    // Apply sort
    if (options.sort) {
      items = this.applySort(items, options.sort);
    }

    // Apply field selection
    if (options.fields) {
      items = items.map(item => {
        const selected: any = { id: item.id };
        options.fields!.forEach(field => {
          if (field in item) {
            selected[field] = (item as any)[field];
          }
        });
        return selected;
      });
    }

    return items;
  }

  async findPaginated(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const allItems = await this.findMany(options);
    const { items, total, pages } = this.applyPagination(
      allItems,
      options.pagination
    );

    return {
      data: items,
      total,
      page: options.pagination?.page || 1,
      limit: options.pagination?.limit || total,
      pages
    };
  }

  async update(
    id: string | number, 
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T> {
    const existing = await this.findById(id);
    
    if (!existing) {
      throw new Error(`${this.config.entityName} with id ${id} not found`);
    }

    const updated = {
      ...existing,
      ...data,
      ...this.addTimestamps({}, true)
    } as T;

    this.data.set(id, updated);

    // Clear cache
    if (this.config.cache) {
      cacheService.invalidate(`${this.config.entityName}:${id}`);
      this.invalidateCache();
    }

    // Notify subscribers
    this.notifyChange('updated', updated);

    return updated;
  }

  async delete(id: string | number): Promise<boolean> {
    const existing = await this.findById(id);
    
    if (!existing) {
      return false;
    }

    if (this.config.softDelete) {
      // Soft delete - just mark as deleted
      await this.update(id, { deletedAt: new Date() } as any);
    } else {
      // Hard delete
      this.data.delete(id);
    }

    // Clear cache
    if (this.config.cache) {
      cacheService.invalidate(`${this.config.entityName}:${id}`);
      this.invalidateCache();
    }

    // Notify subscribers
    this.notifyChange('deleted', existing);

    return true;
  }

  // ============ Real-time Support ============

  subscribe(callback: (event: any) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifyChange(type: 'created' | 'updated' | 'deleted', entity: T): void {
    const event = {
      type,
      entity,
      timestamp: new Date(),
      source: 'memory'
    };

    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  // ============ Helper Methods ============

  private invalidateCache(): void {
    cacheService.invalidatePattern(new RegExp(`^${this.config.entityName}:`));
  }

  /**
   * Load initial data
   */
  async loadData(data: T[]): Promise<void> {
    this.data.clear();
    
    for (const item of data) {
      this.data.set(item.id, item);
    }

    if (this.config.cache) {
      this.invalidateCache();
    }
  }

  /**
   * Export all data
   */
  async exportData(): Promise<T[]> {
    return Array.from(this.data.values());
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.data.clear();
    
    if (this.config.cache) {
      this.invalidateCache();
    }
  }

  /**
   * Get memory usage stats
   */
  getStats() {
    return {
      count: this.data.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): string {
    // Rough estimation of memory usage
    const jsonSize = JSON.stringify(Array.from(this.data.values())).length;
    
    if (jsonSize < 1024) {
      return `${jsonSize} B`;
    } else if (jsonSize < 1024 * 1024) {
      return `${(jsonSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(jsonSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}