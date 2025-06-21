import { StorageService } from './storage';
import { DesktopStorageService } from './storage.desktop';
import { WebStorageService } from './storage.web';
import { isElectron } from '../platform';

let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!storageInstance) {
    if (isElectron()) {
      storageInstance = new DesktopStorageService();
    } else {
      storageInstance = new WebStorageService();
    }
  }
  return storageInstance;
}

// For testing or special cases where you want to override the storage
export function setStorage(storage: StorageService): void {
  storageInstance = storage;
}

// Reset storage instance (useful for testing)
export function resetStorage(): void {
  storageInstance = null;
}