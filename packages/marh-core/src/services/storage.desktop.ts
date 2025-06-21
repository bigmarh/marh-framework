import { BaseStorageService } from './storage';
import { IPC } from './ipc';

export class DesktopStorageService extends BaseStorageService {
  private prefix = 'marh-storage';

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await IPC.invoke<string>('storage:get', this.getKey(key));
      if (!result.success || !result.data) {
        return null;
      }
      return JSON.parse(result.data) as T;
    } catch (error) {
      console.warn('Failed to get from desktop storage:', error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await IPC.invoke('storage:set', this.getKey(key), serialized);
    } catch (error) {
      console.error('Failed to set in desktop storage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await IPC.invoke('storage:remove', this.getKey(key));
    } catch (error) {
      console.error('Failed to remove from desktop storage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const allKeys = await this.keys();
      await Promise.all(allKeys.map(key => this.remove(key)));
    } catch (error) {
      console.error('Failed to clear desktop storage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const result = await IPC.invoke<string[]>('storage:keys', this.prefix);
      if (!result.success || !result.data) {
        return [];
      }
      // Remove the prefix from keys
      return result.data
        .filter(key => key.startsWith(this.prefix + ':'))
        .map(key => key.substring(this.prefix.length + 1));
    } catch (error) {
      console.warn('Failed to get keys from desktop storage:', error);
      return [];
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}