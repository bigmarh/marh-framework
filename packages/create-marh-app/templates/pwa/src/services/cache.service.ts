import { CacheService as BaseCacheService, cached } from '../../shared/src/services/cache.service';
import { platform } from '@marh/core';

/**
 * PWA Cache Service
 * 
 * Extends the base cache service with PWA-specific features:
 * - IndexedDB persistence for offline support
 * - Network-aware caching strategies
 * - Service worker integration
 * - Smaller cache size for mobile devices
 */
export class PWACacheService extends BaseCacheService {
  private db: IDBDatabase | null = null;
  private dbName = 'marh-pwa-cache';
  private storeName = 'cache-entries';

  constructor() {
    super(50); // Smaller cache size for mobile/PWA
    this.initIndexedDB();
    this.setupNetworkListeners();
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return;
    }

    try {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.loadFromIndexedDB();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
    }
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    // Clear stale cache when coming online
    window.addEventListener('online', () => {
      this.cleanup();
    });

    // Use more aggressive caching when offline
    window.addEventListener('offline', () => {
      console.log('PWA Cache: Offline mode activated');
    });
  }

  /**
   * Load cache from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const now = Date.now();

        entries.forEach((entry: any) => {
          // Only load non-expired entries
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(entry.key, entry);
          }
        });
      };
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }
  }

  /**
   * Save entry to IndexedDB
   */
  private async saveToIndexedDB(key: string, entry: any): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(entry);
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  }

  /**
   * Override set to include IndexedDB persistence
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    super.set(key, data, ttl);
    
    const entry = this.cache.get(key);
    if (entry) {
      this.saveToIndexedDB(key, entry);
    }
  }

  /**
   * Override invalidate to handle IndexedDB
   */
  invalidate(key: string): void {
    super.invalidate(key);
    
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.delete(key);
      } catch (error) {
        console.error('Failed to delete from IndexedDB:', error);
      }
    }
  }

  /**
   * Override clear to handle IndexedDB
   */
  clear(): void {
    super.clear();
    
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.clear();
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
    }
  }

  /**
   * Network-first caching strategy
   * Try network first, fall back to cache if offline
   */
  async networkFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    if (navigator.onLine) {
      try {
        const data = await fetcher();
        this.set(key, data, ttl);
        return data;
      } catch (error) {
        // Fall back to cache if network fails
        const cached = this.cache.get(key);
        if (cached) {
          console.log(`Network failed, using cached data for key: ${key}`);
          return cached.data;
        }
        throw error;
      }
    } else {
      // Offline - try cache first
      const cached = this.cache.get(key);
      if (cached) {
        return cached.data;
      }
      throw new Error('Offline and no cached data available');
    }
  }

  /**
   * Cache-first strategy
   * Use cache if available, otherwise fetch from network
   */
  async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Update cache in background if online
      if (navigator.onLine) {
        fetcher().then(data => {
          this.set(key, data, ttl);
        }).catch(() => {
          // Ignore background update failures
        });
      }
      return cached.data;
    }

    // No valid cache, fetch from network
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Stale-while-revalidate strategy
   * Return stale data immediately, update in background
   */
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Return stale data immediately if available
    if (cached) {
      // Update in background
      if (navigator.onLine) {
        fetcher().then(data => {
          this.set(key, data, ttl);
        }).catch(() => {
          // Keep using stale data
        });
      }
      return cached.data;
    }

    // No cache, must fetch
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

// Export singleton instance
export const cacheService = new PWACacheService();

// Re-export decorator
export { cached };