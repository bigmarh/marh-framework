import { PWACrudService } from './pwa-crud.service';
import { BaseEntity } from '../../shared/src/services/crud.interface';

/**
 * User entity interface
 */
export interface User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  lastLogin?: Date;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User service for PWA application
 * 
 * Provides user management with PWA-specific features:
 * - IndexedDB persistence for offline support
 * - Network-aware operations
 * - Background sync
 * - Optimized for mobile performance
 */
class UserService extends PWACrudService<User> {
  constructor() {
    super({
      entityName: 'user',
      storeName: 'users',
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes (shorter for mobile)
      softDelete: false, // Hard delete for PWA to save space
      validationRules: {
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        name: { required: true, minLength: 2 },
        role: { required: true, enum: ['admin', 'user', 'guest'] }
      }
    });
  }

  /**
   * Enhanced validation for users
   */
  async validate(data: Partial<User>) {
    const errors: Record<string, string[]> = {};

    // Validate email
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = ['Invalid email format'];
      }
      
      // Check for duplicate email
      const existing = await this.findOne({ email: data.email });
      if (existing && existing.id !== data.id) {
        errors.email = [...(errors.email || []), 'Email already exists'];
      }
    }

    // Validate name
    if (data.name && data.name.length < 2) {
      errors.name = ['Name must be at least 2 characters'];
    }

    // Validate role
    if (data.role && !['admin', 'user', 'guest'].includes(data.role)) {
      errors.role = ['Invalid role'];
    }

    const hasErrors = Object.keys(errors).length > 0;
    return {
      success: !hasErrors,
      data: hasErrors ? undefined : data as User,
      validationErrors: hasErrors ? errors : undefined
    };
  }

  /**
   * Create user with validation and offline support
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const validation = await this.validate(userData);
    if (!validation.success) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.validationErrors)}`);
    }

    return this.create({
      ...userData,
      preferences: {
        theme: 'light',
        notifications: true,
        ...userData.preferences
      }
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: User['role']): Promise<User[]> {
    return this.findMany({
      filter: { role }
    });
  }

  /**
   * Search users (optimized for mobile)
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const allUsers = await this.findMany({
      pagination: { page: 1, limit }
    });

    return allUsers.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get user with network-first strategy
   */
  async getUserNetworkFirst(userId: string): Promise<User | null> {
    return this.findByIdNetworkFirst(userId);
  }

  /**
   * Get user with cache-first strategy (better for offline)
   */
  async getUserCacheFirst(userId: string): Promise<User | null> {
    return this.findByIdCacheFirst(userId);
  }

  /**
   * Get users with mobile-optimized pagination
   */
  async getUsersPaginated(page: number = 1, limit: number = 20) {
    return this.findPaginated({
      pagination: { page, limit },
      sort: { field: 'name', direction: 'asc' }
    });
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.update(userId, {
      lastLogin: new Date()
    });
  }

  /**
   * Update user preferences with offline support
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<User['preferences']>
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.update(userId, {
      preferences: {
        ...user.preferences,
        ...preferences
      }
    });
  }

  /**
   * Get current user (from cache/local storage)
   */
  async getCurrentUser(): Promise<User | null> {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return null;
    
    return this.findById(currentUserId);
  }

  /**
   * Set current user
   */
  async setCurrentUser(userId: string): Promise<void> {
    localStorage.setItem('currentUserId', userId);
    await this.updateLastLogin(userId);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    localStorage.removeItem('currentUserId');
  }

  /**
   * Sync all users with server (when online)
   */
  async syncUsers(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    
    return this.syncAll();
  }

  /**
   * Get offline status and pending sync info
   */
  getOfflineInfo() {
    return {
      ...this.getOfflineStatus(),
      hasCurrentUser: !!localStorage.getItem('currentUserId')
    };
  }

  /**
   * Export user data for backup
   */
  async exportUserData(): Promise<string> {
    const backup = await this.exportForBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    return 'Export completed';
  }

  /**
   * Import user data from backup
   */
  async importUserData(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          await this.importFromBackup(backup);
          resolve(backup.data.length);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Clear all user data (for logout/reset)
   */
  async clearAllUserData(): Promise<void> {
    await this.clearOfflineData();
    localStorage.removeItem('currentUserId');
  }

  /**
   * Get user statistics (offline-aware)
   */
  async getUserStats() {
    const [total, admins] = await Promise.all([
      this.count(),
      this.count({ role: 'admin' })
    ]);

    return {
      total,
      admins,
      regularUsers: total - admins,
      offlineStatus: this.getOfflineStatus()
    };
  }

  /**
   * Setup PWA-specific event listeners
   */
  setupPWAEventListeners() {
    // Listen for app install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    // Listen for network changes
    window.addEventListener('online', () => {
      console.log('Back online - syncing users');
      this.syncUsers().catch(console.error);
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline - operations will be queued');
    });
  }
}

// Export singleton instance
export const userService = new UserService();

// Setup PWA event listeners on initialization
userService.setupPWAEventListeners();

// Example usage:
/*
// Create a new user (works offline)
const user = await userService.createUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'user',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});

// Get user with cache-first strategy (good for offline)
const cachedUser = await userService.getUserCacheFirst(user.id);

// Get user with network-first strategy (fresh data when online)
const freshUser = await userService.getUserNetworkFirst(user.id);

// Search users (mobile-optimized)
const results = await userService.searchUsers('jane', 10);

// Set current user
await userService.setCurrentUser(user.id);

// Check offline status
const offlineInfo = userService.getOfflineInfo();
console.log('Offline info:', offlineInfo);

// Export data for backup
await userService.exportUserData();

// Get statistics
const stats = await userService.getUserStats();
console.log('User stats:', stats);
*/