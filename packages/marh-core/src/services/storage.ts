export interface StorageService {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
}

export abstract class BaseStorageService implements StorageService {
  abstract get<T = any>(key: string): Promise<T | null>;
  abstract set<T = any>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract keys(): Promise<string[]>;
  
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}