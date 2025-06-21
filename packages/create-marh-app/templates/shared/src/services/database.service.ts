/**
 * Database Service for MARH Applications
 * 
 * Provides a configured database instance based on platform and environment.
 * Can be easily switched between different database adapters.
 */

import { 
  Database, 
  DatabasePresets, 
  Schema, 
  Migrations, 
  MigrationPatterns,
  IDatabase 
} from '../database';
import { platform } from '@marh/core';

/**
 * Database configuration based on environment
 */
const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const dbType = process.env.DATABASE_TYPE || 'auto';
  
  // Auto-detect best database for platform
  if (dbType === 'auto') {
    if (platform.isElectron) {
      // Desktop: Use SQLite (fallback to memory for demo)
      return DatabasePresets.memory('marh-desktop-app');
    } else if (platform.supportsServiceWorker) {
      // PWA: Use IndexedDB (fallback to memory for demo)
      return DatabasePresets.memory('marh-pwa-app');
    } else {
      // Web: Use REST API
      const apiUrl = process.env.API_URL || 'https://api.example.com';
      return DatabasePresets.restAPI('marh-web-app', apiUrl);
    }
  }
  
  // Manual configuration
  switch (dbType) {
    case 'memory':
      return DatabasePresets.memory('marh-app');
    
    case 'rest-api':
      const apiUrl = process.env.API_URL || 'https://api.example.com';
      return DatabasePresets.restAPI('marh-app', apiUrl, {
        'Authorization': `Bearer ${process.env.API_TOKEN || ''}`
      });
    
    case 'sqlite':
      // For when SQLite adapter is implemented
      return {
        type: 'sqlite' as const,
        name: 'marh-app',
        autoMigrate: true,
        options: {
          path: process.env.DB_PATH || './data/app.sqlite'
        }
      };
    
    case 'indexeddb':
      // For when IndexedDB adapter is implemented
      return {
        type: 'indexeddb' as const,
        name: 'marh-app',
        autoMigrate: true,
        options: {
          version: 1
        }
      };
    
    default:
      return DatabasePresets.memory('marh-app');
  }
};

/**
 * Application database schemas
 */
export const AppSchemas = {
  /**
   * Users table schema
   */
  users: Schema.table('users')
    .field('id', Schema.fields.uuid())
    .field('email', Schema.fields.email())
    .field('firstName', Schema.fields.string(50))
    .field('lastName', Schema.fields.string(50))
    .field('role', Schema.fields.enum(['admin', 'user', 'guest'], 'user'))
    .field('isActive', Schema.fields.boolean(true))
    .field('lastLoginAt', { type: 'date', required: false })
    .timestamps()
    .index('idx_users_email', ['email'], true)
    .index('idx_users_role', ['role'])
    .build(),

  /**
   * Posts table schema (example content)
   */
  posts: Schema.table('posts')
    .field('id', Schema.fields.uuid())
    .field('title', Schema.fields.string(200))
    .field('content', Schema.fields.text())
    .field('authorId', Schema.fields.string())
    .field('status', Schema.fields.enum(['draft', 'published', 'archived'], 'draft'))
    .field('publishedAt', { type: 'date', required: false })
    .timestamps()
    .index('idx_posts_author', ['authorId'])
    .index('idx_posts_status', ['status'])
    .index('idx_posts_published', ['publishedAt'])
    .build(),

  /**
   * Settings table schema
   */
  settings: Schema.table('settings')
    .field('id', Schema.fields.uuid())
    .field('key', Schema.fields.string(100))
    .field('value', Schema.fields.json())
    .field('category', Schema.fields.string(50))
    .field('description', { type: 'text', required: false })
    .timestamps()
    .index('idx_settings_key', ['key'], true)
    .index('idx_settings_category', ['category'])
    .build()
};

/**
 * Application migrations
 */
export const AppMigrations = [
  // Initial schema
  Migrations.createInitial([
    AppSchemas.users,
    AppSchemas.posts,
    AppSchemas.settings
  ]),
  
  // Add user authentication (if needed)
  MigrationPatterns.addUserAuth(),
  
  // Add audit logging (if needed)
  MigrationPatterns.addAuditLog(),
  
  // Custom migration example
  Migrations.create('add_user_preferences', 'Add user preferences table')
    .createTable('user_preferences', {
      fields: {
        id: Schema.fields.uuid(),
        userId: Schema.fields.string(),
        theme: Schema.fields.enum(['light', 'dark'], 'light'),
        language: Schema.fields.enum(['en', 'es', 'fr'], 'en'),
        notifications: Schema.fields.boolean(true),
        timezone: Schema.fields.string(50),
        ...Schema.fields.timestamps()
      }
    })
    .createIndex('user_preferences', 'idx_user_prefs_user', ['userId'], true)
    .build()
];

/**
 * Database service class
 */
class DatabaseService {
  private database: IDatabase;
  private isInitialized = false;

  constructor() {
    const config = getDatabaseConfig();
    this.database = Database.create(config);
    
    // Set up event listeners
    this.database.on('connected', () => {
      console.log('✓ Database connected');
    });
    
    this.database.on('error', (event: any) => {
      console.error('✗ Database error:', event.error);
    });
    
    if (config.debug) {
      this.database.on('query', (event: any) => {
        console.log('📊 Query:', event.context.query, event.duration + 'ms');
      });
    }
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to database
      await this.database.connect();
      
      // Run migrations if enabled
      if (this.database.config.autoMigrate) {
        await this.database.migrate(AppMigrations);
      }
      
      // Seed initial data if needed
      await this.seedInitialData();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): IDatabase {
    if (!this.isInitialized) {
      console.warn('⚠️  Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Get a table instance
   */
  table<T extends any>(name: string) {
    return this.database.table<T>(name);
  }

  /**
   * Convenient access to common tables
   */
  get users() {
    return this.table('users');
  }

  get posts() {
    return this.table('posts');
  }

  get settings() {
    return this.table('settings');
  }

  /**
   * Seed initial data for development
   */
  private async seedInitialData(): Promise<void> {
    try {
      // Check if we already have data
      const userCount = await this.users.count();
      if (userCount > 0) return; // Already seeded

      console.log('🌱 Seeding initial data...');

      // Create default admin user
      const adminUser = await this.users.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });

      // Create sample posts
      await this.posts.createMany([
        {
          title: 'Welcome to MARH Framework',
          content: 'This is your first post created with the MARH database system!',
          authorId: adminUser.id,
          status: 'published',
          publishedAt: new Date()
        },
        {
          title: 'Database Adapters',
          content: 'MARH supports multiple database backends through a unified interface.',
          authorId: adminUser.id,
          status: 'draft'
        }
      ]);

      // Create default settings
      await this.settings.createMany([
        {
          key: 'app.name',
          value: 'MARH Application',
          category: 'general',
          description: 'Application name'
        },
        {
          key: 'app.version',
          value: '1.0.0',
          category: 'general',
          description: 'Application version'
        },
        {
          key: 'features.registration',
          value: true,
          category: 'features',
          description: 'Allow user registration'
        }
      ]);

      console.log('✅ Initial data seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed initial data:', error);
      // Don't throw - seeding failure shouldn't break the app
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const analysis = await this.database.analyze();
      return {
        isConnected: this.database.isConnected,
        platform: platform.platform,
        databaseType: this.database.config.type,
        tables: analysis.tables,
        totalRecords: analysis.tables.reduce((sum, table) => sum + table.rowCount, 0)
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        isConnected: this.database.isConnected,
        platform: platform.platform,
        databaseType: this.database.config.type,
        tables: [],
        totalRecords: 0,
        error: error.message
      };
    }
  }

  /**
   * Backup database
   */
  async backup(): Promise<string> {
    return this.database.backup();
  }

  /**
   * Restore database from backup
   */
  async restore(backupData: string): Promise<void> {
    return this.database.restore(backupData);
  }

  /**
   * Clean shutdown
   */
  async destroy(): Promise<void> {
    if (this.database) {
      await this.database.destroy();
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

// Initialize on import in non-test environments
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  databaseService.initialize().catch(console.error);
}

// Convenience exports
export { DatabaseService };
export default databaseService;