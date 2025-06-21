import { CacheService as BaseCacheService, cached } from '../../shared/src/services/cache.service';
import { IPC } from '@marh/core';

/**
 * Desktop Cache Service
 * 
 * Extends the base cache service with desktop-specific features:
 * - Persistent cache to disk via IPC
 * - Larger default cache size (desktop has more memory)
 * - Background cleanup tasks
 */
export class DesktopCacheService extends BaseCacheService {
  private persistentKeys = new Set<string>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super(500); // Larger cache size for desktop
    this.startCleanupTask();
    this.loadPersistentCache();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTask(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup task
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Load persistent cache from disk
   */
  private async loadPersistentCache(): Promise<void> {
    try {
      const data = await IPC.invoke<string>('cache:load');
      if (data) {
        const parsed = JSON.parse(data);
        // Only load non-expired entries
        const now = Date.now();
        for (const entry of parsed.entries) {
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(entry.key, entry);
            this.persistentKeys.add(entry.key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persistent cache:', error);
    }
  }

  /**
   * Save persistent cache to disk
   */
  private async savePersistentCache(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries())
        .filter(([key]) => this.persistentKeys.has(key))
        .map(([_, entry]) => entry);

      await IPC.invoke('cache:save', JSON.stringify({ entries }));
    } catch (error) {
      console.error('Failed to save persistent cache:', error);
    }
  }

  /**
   * Set cache data with option to persist
   */
  setPersistent<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.set(key, data, ttl);
    this.persistentKeys.add(key);
    this.savePersistentCache();
  }

  /**
   * Override invalidate to handle persistent cache
   */
  invalidate(key: string): void {
    super.invalidate(key);
    if (this.persistentKeys.has(key)) {
      this.persistentKeys.delete(key);
      this.savePersistentCache();
    }
  }

  /**
   * Override clear to handle persistent cache
   */
  clear(): void {
    super.clear();
    this.persistentKeys.clear();
    this.savePersistentCache();
  }

  /**
   * Cache file data with automatic file watching
   */
  async cacheFile<T>(
    filePath: string,
    parser: (content: string) => T,
    ttl: number = 10 * 60 * 1000 // 10 minutes
  ): Promise<T> {
    const key = `file:${filePath}`;
    
    return this.get(key, async () => {
      const content = await IPC.invoke<string>('file:read', filePath);
      const data = parser(content);
      
      // Set up file watcher to invalidate cache on change
      IPC.on(`file:changed:${filePath}`, () => {
        this.invalidate(key);
      });
      
      return data;
    }, ttl);
  }
}

// Export singleton instance
export const cacheService = new DesktopCacheService();

// Re-export decorator
export { cached };