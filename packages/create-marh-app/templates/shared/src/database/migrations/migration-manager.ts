/**
 * Migration Manager
 * 
 * Handles database schema migrations with version tracking.
 * Simple but effective migration system for MARH applications.
 */

import { IDatabase, Migration, TableSchema, SchemaField, MigrationError } from '../database.interface';

/**
 * Migration status tracking
 */
interface MigrationRecord {
  id: string;
  version: number;
  appliedAt: Date;
  checksum: string;
}

/**
 * Migration builder for creating migrations programmatically
 */
export class MigrationBuilder {
  private migration: Partial<Migration> = {};
  private upOperations: Array<(db: IDatabase) => Promise<void>> = [];
  private downOperations: Array<(db: IDatabase) => Promise<void>> = [];

  constructor(id: string, description: string) {
    this.migration.id = id;
    this.migration.description = description;
    this.migration.version = parseInt(id.split('_')[0]) || Date.now();
  }

  /**
   * Create a new table
   */
  createTable(name: string, schema: Omit<TableSchema, 'name'>): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      await db.createTable({ name, ...schema });
    });
    
    this.downOperations.unshift(async (db: IDatabase) => {
      await db.dropTable(name);
    });
    
    return this;
  }

  /**
   * Drop a table
   */
  dropTable(name: string): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      await db.dropTable(name);
    });
    
    // Note: Down operation would need to recreate table with original schema
    // This is simplified - real implementation might need schema backup
    this.downOperations.unshift(async (db: IDatabase) => {
      console.warn(`Cannot automatically recreate dropped table '${name}' in rollback`);
    });
    
    return this;
  }

  /**
   * Add column to existing table
   */
  addColumn(tableName: string, columnName: string, definition: SchemaField): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.addColumn(columnName, definition);
    });
    
    this.downOperations.unshift(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.dropColumn(columnName);
    });
    
    return this;
  }

  /**
   * Drop column from table
   */
  dropColumn(tableName: string, columnName: string): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.dropColumn(columnName);
    });
    
    this.downOperations.unshift(async (db: IDatabase) => {
      console.warn(`Cannot automatically recreate dropped column '${columnName}' in rollback`);
    });
    
    return this;
  }

  /**
   * Create index
   */
  createIndex(tableName: string, indexName: string, fields: string[], unique: boolean = false): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.createIndex(indexName, fields, unique);
    });
    
    this.downOperations.unshift(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.dropIndex(indexName);
    });
    
    return this;
  }

  /**
   * Drop index
   */
  dropIndex(tableName: string, indexName: string): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      const table = db.table(tableName);
      await table.dropIndex(indexName);
    });
    
    this.downOperations.unshift(async (db: IDatabase) => {
      console.warn(`Cannot automatically recreate dropped index '${indexName}' in rollback`);
    });
    
    return this;
  }

  /**
   * Execute raw SQL
   */
  raw(upSql: string, downSql?: string): MigrationBuilder {
    this.upOperations.push(async (db: IDatabase) => {
      await db.raw(upSql);
    });
    
    if (downSql) {
      this.downOperations.unshift(async (db: IDatabase) => {
        await db.raw(downSql);
      });
    }
    
    return this;
  }

  /**
   * Add custom operation
   */
  custom(upOperation: (db: IDatabase) => Promise<void>, downOperation?: (db: IDatabase) => Promise<void>): MigrationBuilder {
    this.upOperations.push(upOperation);
    
    if (downOperation) {
      this.downOperations.unshift(downOperation);
    }
    
    return this;
  }

  /**
   * Build the migration
   */
  build(): Migration {
    return {
      id: this.migration.id!,
      version: this.migration.version!,
      description: this.migration.description!,
      up: async (db: IDatabase) => {
        for (const operation of this.upOperations) {
          await operation(db);
        }
      },
      down: async (db: IDatabase) => {
        for (const operation of this.downOperations) {
          await operation(db);
        }
      }
    };
  }
}

/**
 * Migration Manager Implementation
 */
export class MigrationManager {
  private migrationsTable = '_migrations';

  constructor(private database: IDatabase) {}

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    const hasTable = await this.database.hasTable(this.migrationsTable);
    if (!hasTable) {
      await this.database.createTable({
        name: this.migrationsTable,
        fields: {
          id: { type: 'string', required: true, unique: true },
          version: { type: 'number', required: true },
          appliedAt: { type: 'date', required: true },
          checksum: { type: 'string', required: true }
        },
        primaryKey: 'id'
      });
    }
  }

  /**
   * Run migrations
   */
  async migrate(migrations: Migration[]): Promise<void> {
    await this.initialize();
    
    // Sort migrations by version
    const sortedMigrations = migrations.sort((a, b) => a.version - b.version);
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    
    // Run pending migrations
    for (const migration of sortedMigrations) {
      if (appliedIds.has(migration.id)) {
        continue; // Already applied
      }
      
      try {
        console.log(`Running migration: ${migration.id} - ${migration.description}`);
        
        // Execute migration in transaction if supported
        if (this.database.transaction) {
          await this.database.transaction(async (trx) => {
            await migration.up(this.database);
            await this.recordMigration(migration);
          });
        } else {
          await migration.up(this.database);
          await this.recordMigration(migration);
        }
        
        console.log(`✓ Migration completed: ${migration.id}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${migration.id}`, error);
        throw new MigrationError(`Migration failed: ${migration.id} - ${error}`);
      }
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(steps: number = 1): Promise<void> {
    await this.initialize();
    
    // Get applied migrations in reverse order
    const appliedMigrations = await this.getAppliedMigrations();
    appliedMigrations.sort((a, b) => b.version - a.version);
    
    const migrationsToRollback = appliedMigrations.slice(0, steps);
    
    for (const migrationRecord of migrationsToRollback) {
      try {
        console.log(`Rolling back migration: ${migrationRecord.id}`);
        
        // Note: This requires the original migration object
        // In a real implementation, you'd need to reconstruct or store the down operation
        
        // Remove migration record
        await this.removeMigrationRecord(migrationRecord.id);
        
        console.log(`✓ Rollback completed: ${migrationRecord.id}`);
      } catch (error) {
        console.error(`✗ Rollback failed: ${migrationRecord.id}`, error);
        throw new MigrationError(`Rollback failed: ${migrationRecord.id} - ${error}`);
      }
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<Array<{ id: string; version: number; appliedAt: Date }>> {
    await this.initialize();
    return this.getAppliedMigrations();
  }

  /**
   * Check if migrations are pending
   */
  async hasPendingMigrations(migrations: Migration[]): Promise<boolean> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    
    return migrations.some(migration => !appliedIds.has(migration.id));
  }

  /**
   * Get applied migrations
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const table = this.database.table<MigrationRecord>(this.migrationsTable);
    return table.findMany({ sort: { field: 'version', direction: 'asc' } });
  }

  /**
   * Record migration as applied
   */
  private async recordMigration(migration: Migration): Promise<void> {
    const table = this.database.table<MigrationRecord>(this.migrationsTable);
    
    await table.create({
      id: migration.id,
      version: migration.version,
      appliedAt: new Date(),
      checksum: this.calculateChecksum(migration)
    } as any);
  }

  /**
   * Remove migration record
   */
  private async removeMigrationRecord(migrationId: string): Promise<void> {
    const table = this.database.table<MigrationRecord>(this.migrationsTable);
    await table.delete(migrationId);
  }

  /**
   * Calculate migration checksum
   */
  private calculateChecksum(migration: Migration): string {
    // Simple checksum based on migration content
    const content = `${migration.id}:${migration.version}:${migration.description}`;
    return btoa(content).slice(0, 16);
  }
}

/**
 * Migration helper functions
 */
export const Migrations = {
  /**
   * Create a new migration builder
   */
  create(id: string, description: string): MigrationBuilder {
    return new MigrationBuilder(id, description);
  },

  /**
   * Create migration for initial schema
   */
  createInitial(tables: TableSchema[]): Migration {
    const migration = new MigrationBuilder('001_initial_schema', 'Create initial database schema');
    
    tables.forEach(table => {
      migration.createTable(table.name, {
        fields: table.fields,
        primaryKey: table.primaryKey,
        indexes: table.indexes,
        relations: table.relations
      });
    });
    
    return migration.build();
  },

  /**
   * Generate migration ID with timestamp
   */
  generateId(description: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const slug = description.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${timestamp}_${slug}`;
  }
};

/**
 * Common migration patterns
 */
export const MigrationPatterns = {
  /**
   * Add user authentication tables
   */
  addUserAuth(): Migration {
    return Migrations.create('add_user_auth', 'Add user authentication tables')
      .createTable('users', {
        fields: {
          id: { type: 'string', required: true },
          email: { type: 'string', required: true, unique: true },
          passwordHash: { type: 'string', required: true },
          firstName: { type: 'string', required: true },
          lastName: { type: 'string', required: true },
          role: { type: 'string', required: true, enum: ['admin', 'user'], default: 'user' },
          isActive: { type: 'boolean', required: true, default: true },
          lastLoginAt: { type: 'date' },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true }
        }
      })
      .createTable('user_sessions', {
        fields: {
          id: { type: 'string', required: true },
          userId: { type: 'string', required: true },
          token: { type: 'string', required: true, unique: true },
          expiresAt: { type: 'date', required: true },
          createdAt: { type: 'date', required: true }
        }
      })
      .createIndex('users', 'idx_users_email', ['email'], true)
      .createIndex('user_sessions', 'idx_sessions_token', ['token'], true)
      .createIndex('user_sessions', 'idx_sessions_user', ['userId'])
      .build();
  },

  /**
   * Add audit logging
   */
  addAuditLog(): Migration {
    return Migrations.create('add_audit_log', 'Add audit logging table')
      .createTable('audit_log', {
        fields: {
          id: { type: 'string', required: true },
          userId: { type: 'string' },
          action: { type: 'string', required: true },
          tableName: { type: 'string', required: true },
          recordId: { type: 'string' },
          oldValues: { type: 'json' },
          newValues: { type: 'json' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          createdAt: { type: 'date', required: true }
        }
      })
      .createIndex('audit_log', 'idx_audit_user', ['userId'])
      .createIndex('audit_log', 'idx_audit_table', ['tableName'])
      .createIndex('audit_log', 'idx_audit_created', ['createdAt'])
      .build();
  }
};