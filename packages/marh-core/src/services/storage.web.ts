import { BaseStorageService } from './storage';

export class WebStorageService extends BaseStorageService {
  private prefix = 'marh-storage';

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn('Failed to get from web storage:', error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error('Failed to set in web storage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Failed to remove from web storage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      keys.forEach(key => localStorage.removeItem(this.getKey(key)));
    } catch (error) {
      console.error('Failed to clear web storage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys: string[] = [];
      const prefixWithColon = this.prefix + ':';
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixWithColon)) {
          // Remove the prefix from the key
          allKeys.push(key.substring(prefixWithColon.length));
        }
      }
      
      return allKeys;
    } catch (error) {
      console.warn('Failed to get keys from web storage:', error);
      return [];
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}