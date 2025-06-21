import { DesktopCrudService } from './desktop-crud.service';
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
 * User service for desktop application
 * 
 * Provides user management with desktop-specific features:
 * - File-based persistence
 * - Automatic backups
 * - Full-text search
 * - Import/export functionality
 */
class UserService extends DesktopCrudService<User> {
  constructor() {
    super({
      entityName: 'user',
      persistenceKey: 'users-data',
      cache: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      softDelete: true, // Keep deleted users for audit
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
   * Create user with validation
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
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    return this.search(query, ['name', 'email']);
  }

  /**
   * Get users with pagination and sorting
   */
  async getUsersPaginated(page: number = 1, limit: number = 10, sortBy: string = 'name') {
    return this.findPaginated({
      pagination: { page, limit },
      sort: { field: sortBy, direction: 'asc' }
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
   * Update user preferences
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
   * Get admin users
   */
  async getAdmins(): Promise<User[]> {
    return this.findByRole('admin');
  }

  /**
   * Get active users (logged in within last 30 days)
   */
  async getActiveUsers(): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.findMany({
      filter: {
        lastLogin: { $gte: thirtyDaysAgo }
      }
    });
  }

  /**
   * Export users to CSV
   */
  async exportUsers(filePath: string = 'users.csv'): Promise<void> {
    return this.exportToFile(filePath, 'csv');
  }

  /**
   * Import users from JSON file
   */
  async importUsers(filePath: string): Promise<number> {
    return this.importFromFile(filePath);
  }

  /**
   * Create backup of user data
   */
  async backupUsers(): Promise<string> {
    return this.backup();
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [total, admins, activeUsers] = await Promise.all([
      this.count(),
      this.count({ role: 'admin' }),
      this.getActiveUsers().then(users => users.length)
    ]);

    return {
      total,
      admins,
      regularUsers: total - admins,
      activeUsers,
      inactiveUsers: total - activeUsers
    };
  }
}

// Export singleton instance
export const userService = new UserService();

// Example usage:
/*
// Create a new user
const user = await userService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});

// Search users
const results = await userService.searchUsers('john');

// Get paginated users
const page = await userService.getUsersPaginated(1, 10, 'name');

// Update preferences
await userService.updatePreferences(user.id, {
  theme: 'light'
});

// Export users
await userService.exportUsers('backup/users.csv');

// Get statistics
const stats = await userService.getUserStats();
console.log('User stats:', stats);
*/