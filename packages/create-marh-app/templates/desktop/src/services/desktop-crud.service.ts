import { MemoryCrudService } from '../../shared/src/services/memory-crud.service';
import { BaseEntity, CrudConfig, PaginatedResult, QueryOptions } from '../../shared/src/services/crud.interface';
import { cacheService } from './cache.service';

/**
 * Desktop CRUD Service
 * 
 * Extends the memory CRUD service with desktop-specific features:
 * - IPC integration for file/database operations
 * - Automatic file-based persistence
 * - Background sync with remote servers
 * - Larger data capacity
 */
export class DesktopCrudService<T extends BaseEntity> extends MemoryCrudService<T> {
  private persistenceKey: string;
  private syncInterval?: NodeJS.Timer;
  private isDirty: boolean = false;

  constructor(config: CrudConfig & { persistenceKey?: string; syncUrl?: string }) {
    super(config);
    this.persistenceKey = config.persistenceKey || `crud-${config.entityName}`;
    
    // Load persisted data on initialization
    this.loadPersistedData();
    
    // Set up auto-save
    this.setupAutoSave();
    
    // Set up sync if URL provided
    if (config.syncUrl) {
      this.setupSync(config.syncUrl);
    }
  }

  // ============ Desktop-Specific Features ============

  /**
   * Load data from file system via IPC
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // In a real implementation, this would use IPC to read from file
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        const data = JSON.parse(stored) as T[];
        await this.loadData(data);
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  /**
   * Save data to file system via IPC
   */
  private async persistData(): Promise<void> {
    if (!this.isDirty) return;
    
    try {
      const data = await this.exportData();
      // In a real implementation, this would use IPC to write to file
      localStorage.setItem(this.persistenceKey, JSON.stringify(data));
      this.isDirty = false;
    } catch (error) {
      console.error('Failed to persist data:', error);
    }
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave(): void {
    // Save on data changes
    const originalNotify = this['notifyChange'];
    this['notifyChange'] = (type: any, entity: any) => {
      this.isDirty = true;
      originalNotify.call(this, type, entity);
    };
    
    // Auto-save every 30 seconds if dirty
    setInterval(() => {
      if (this.isDirty) {
        this.persistData();
      }
    }, 30000);
    
    // Save on window unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.persistData();
      });
    }
  }

  /**
   * Set up background sync with remote server
   */
  private setupSync(syncUrl: string): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncWithRemote(syncUrl);
    }, 5 * 60 * 1000);
    
    // Initial sync
    this.syncWithRemote(syncUrl);
  }

  /**
   * Sync with remote server
   */
  private async syncWithRemote(syncUrl: string): Promise<void> {
    try {
      // Get local data
      const localData = await this.exportData();
      
      // In a real implementation, this would:
      // 1. Send local changes to server
      // 2. Receive remote changes
      // 3. Merge changes intelligently
      // 4. Update local data
      
      console.log(`Syncing ${this.config.entityName} with ${syncUrl}`);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // ============ Enhanced CRUD Operations ============

  /**
   * Create with file backup
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const entity = await super.create(data);
    
    // Trigger background save
    setTimeout(() => this.persistData(), 100);
    
    return entity;
  }

  /**
   * Batch import from file
   */
  async importFromFile(filePath: string): Promise<number> {
    try {
      // In a real implementation, this would use IPC to read file
      // For now, simulate with a fetch
      const response = await fetch(filePath);
      const data = await response.json() as T[];
      
      await this.loadData(data);
      await this.persistData();
      
      return data.length;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Export to file
   */
  async exportToFile(filePath: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    const data = await this.exportData();
    
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      // Simple CSV conversion
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(item => 
        Object.values(item).map(v => 
          typeof v === 'string' ? `"${v}"` : v
        ).join(',')
      );
      content = [headers, ...rows].join('\n');
    }
    
    // In a real implementation, this would use IPC to write file
    // For now, simulate with a download
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Enhanced search with full-text support
   */
  async search(query: string, fields?: string[]): Promise<T[]> {
    const allItems = await this.findMany();
    
    return allItems.filter(item => {
      const searchFields = fields || Object.keys(item);
      return searchFields.some(field => {
        const value = (item as any)[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query.toLowerCase());
        }
        return false;
      });
    });
  }

  /**
   * Backup current data
   */
  async backup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `${this.persistenceKey}-backup-${timestamp}`;
    
    const data = await this.exportData();
    localStorage.setItem(backupKey, JSON.stringify(data));
    
    return backupKey;
  }

  /**
   * Restore from backup
   */
  async restore(backupKey: string): Promise<void> {
    const backup = localStorage.getItem(backupKey);
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    const data = JSON.parse(backup) as T[];
    await this.loadData(data);
    await this.persistData();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.persistData();
  }
}