import { MemoryCrudService } from '../../shared/src/services/memory-crud.service';
import { BaseEntity, CrudConfig, PaginatedResult, QueryOptions } from '../../shared/src/services/crud.interface';
import { cacheService } from './cache.service';

/**
 * PWA CRUD Service
 * 
 * Extends the memory CRUD service with PWA-specific features:
 * - IndexedDB persistence for offline support
 * - Network-aware operations
 * - Service worker integration
 * - Optimized for mobile performance
 */
export class PWACrudService<T extends BaseEntity> extends MemoryCrudService<T> {
  private dbName: string;
  private storeName: string;
  private db?: IDBDatabase;
  private syncQueue: Array<{ operation: string; data: any }> = [];
  private isOnline: boolean = navigator.onLine;

  constructor(config: CrudConfig & { storeName?: string; syncUrl?: string }) {
    super(config);
    this.dbName = `marh-${config.entityName}-db`;
    this.storeName = config.storeName || config.entityName;
    
    // Initialize IndexedDB
    this.initializeDB();
    
    // Set up online/offline handling
    this.setupNetworkHandling();
    
    // Set up service worker sync if URL provided
    if (config.syncUrl) {
      this.setupServiceWorkerSync(config.syncUrl);
    }
  }

  // ============ PWA-Specific Features ============

  /**
   * Initialize IndexedDB
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadFromIndexedDB().then(() => resolve());
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
    });
  }

  /**
   * Load data from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const data = request.result as T[];
        this.loadData(data).then(() => resolve());
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save data to IndexedDB
   */
  private async saveToIndexedDB(entity: T): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entity);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(id: string | number): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set up network event handling
   */
  private setupNetworkHandling(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Set up service worker background sync
   */
  private setupServiceWorkerSync(syncUrl: string): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Register background sync for when we come back online
        registration.sync.register(`${this.config.entityName}-sync`);
      });
    }
  }

  /**
   * Add operation to sync queue for when we're back online
   */
  private addToSyncQueue(operation: string, data: any): void {
    this.syncQueue.push({ operation, data });
    
    // Trigger background sync if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if ('sync' in registration) {
          registration.sync.register(`${this.config.entityName}-sync`);
        }
      });
    }
  }

  /**
   * Process sync queue when back online
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    const queue = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const item of queue) {
      try {
        // In a real implementation, sync with server
        console.log(`Syncing ${item.operation}:`, item.data);
      } catch (error) {
        // Re-add to queue if sync fails
        this.syncQueue.push(item);
        console.error('Sync failed:', error);
      }
    }
  }

  // ============ Enhanced CRUD Operations ============

  /**
   * Create with offline support
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const entity = await super.create(data);
    
    // Save to IndexedDB immediately
    await this.saveToIndexedDB(entity);
    
    // Queue for sync if offline
    if (!this.isOnline) {
      this.addToSyncQueue('create', entity);
    }
    
    return entity;
  }

  /**
   * Update with offline support
   */
  async update(
    id: string | number, 
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T> {
    const entity = await super.update(id, data);
    
    // Save to IndexedDB
    await this.saveToIndexedDB(entity);
    
    // Queue for sync if offline
    if (!this.isOnline) {
      this.addToSyncQueue('update', { id, data });
    }
    
    return entity;
  }

  /**
   * Delete with offline support
   */
  async delete(id: string | number): Promise<boolean> {
    const result = await super.delete(id);
    
    if (result) {
      // Remove from IndexedDB
      await this.deleteFromIndexedDB(id);
      
      // Queue for sync if offline
      if (!this.isOnline) {
        this.addToSyncQueue('delete', { id });
      }
    }
    
    return result;
  }

  /**
   * Network-first find with cache fallback
   */
  async findByIdNetworkFirst(id: string | number): Promise<T | null> {
    if (this.isOnline) {
      try {
        // Try to fetch from network first
        const networkData = await this.fetchFromNetwork(id);
        if (networkData) {
          // Update local cache
          this.data.set(id, networkData);
          await this.saveToIndexedDB(networkData);
          return networkData;
        }
      } catch (error) {
        console.warn('Network fetch failed, falling back to cache:', error);
      }
    }
    
    // Fallback to local data
    return this.findById(id);
  }

  /**
   * Cache-first find with network update
   */
  async findByIdCacheFirst(id: string | number): Promise<T | null> {
    // Try cache first
    const cached = await this.findById(id);
    
    if (cached && this.isOnline) {
      // Update in background
      this.fetchFromNetwork(id).then(networkData => {
        if (networkData) {
          this.data.set(id, networkData);
          this.saveToIndexedDB(networkData);
        }
      }).catch(() => {});
    }
    
    return cached;
  }

  /**
   * Simulate network fetch (replace with actual API calls)
   */
  private async fetchFromNetwork(id: string | number): Promise<T | null> {
    // In a real implementation, this would make API calls
    throw new Error('Network fetch not implemented');
  }

  /**
   * Sync all data with server
   */
  async syncAll(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    try {
      // Get all local data
      const localData = await this.exportData();
      
      // In a real implementation:
      // 1. Send all local data to server
      // 2. Receive latest server data
      // 3. Merge changes intelligently
      // 4. Update local storage
      
      console.log(`Syncing all ${this.config.entityName} data`);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get offline status and sync queue info
   */
  getOfflineStatus() {
    return {
      isOnline: this.isOnline,
      pendingSyncItems: this.syncQueue.length,
      syncQueue: this.syncQueue
    };
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    // Clear memory
    await this.clear();
    
    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    // Clear sync queue
    this.syncQueue = [];
  }

  /**
   * Export data for backup
   */
  async exportForBackup(): Promise<{
    data: T[];
    syncQueue: Array<{ operation: string; data: any }>;
    timestamp: string;
  }> {
    const data = await this.exportData();
    return {
      data,
      syncQueue: [...this.syncQueue],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import from backup
   */
  async importFromBackup(backup: {
    data: T[];
    syncQueue: Array<{ operation: string; data: any }>;
  }): Promise<void> {
    await this.loadData(backup.data);
    this.syncQueue = [...backup.syncQueue];
    
    // Save all to IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      for (const item of backup.data) {
        store.put(item);
      }
    }
  }
}