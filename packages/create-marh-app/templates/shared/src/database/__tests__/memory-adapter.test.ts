/**
 * Memory Database Adapter Tests
 * 
 * Tests for the memory database adapter implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils, TEST_CONSTANTS } from '../../test/setup';
import { MemoryDatabaseAdapter } from '../adapters/memory-adapter';
import { DatabasePresets } from '../database-factory';
import { BaseEntity } from '../../services/crud.interface';

interface TestUser extends BaseEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

describe('MemoryDatabaseAdapter', () => {
  let adapter: MemoryDatabaseAdapter;
  let database: any;

  beforeEach(() => {
    adapter = new MemoryDatabaseAdapter();
    const config = DatabasePresets.memory('test-db');
    database = adapter.createDatabase(config);
  });

  describe('Adapter Properties', () => {
    it('should have correct adapter properties', () => {
      expect(adapter.name).toBe('memory');
      expect(adapter.supportedPlatforms).toEqual(['desktop', 'pwa', 'web']);
    });

    it('should validate configuration correctly', () => {
      const validConfig = { type: 'memory' as const, name: 'test' };
      const invalidConfig = { type: 'invalid' as const, name: 'test' };

      const validResult = adapter.validateConfig(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = adapter.validateConfig(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should provide default configuration', () => {
      const defaultConfig = adapter.getDefaultConfig();
      
      expect(defaultConfig).toHaveProperty('autoMigrate', true);
      expect(defaultConfig).toHaveProperty('debug', true);
    });
  });

  describe('Database Connection', () => {
    it('should connect to memory database', async () => {
      expect(database.isConnected).toBe(false);
      
      await database.connect();
      
      expect(database.isConnected).toBe(true);
    });

    it('should disconnect from memory database', async () => {
      await database.connect();
      expect(database.isConnected).toBe(true);
      
      await database.disconnect();
      
      expect(database.isConnected).toBe(false);
    });

    it('should handle multiple connect calls', async () => {
      await database.connect();
      await database.connect(); // Should not throw
      
      expect(database.isConnected).toBe(true);
    });

    it('should handle disconnect when not connected', async () => {
      expect(database.isConnected).toBe(false);
      
      await database.disconnect(); // Should not throw
      
      expect(database.isConnected).toBe(false);
    });
  });

  describe('Table Operations', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should create and access tables', async () => {
      const userTable = database.table<TestUser>('users');
      
      expect(userTable).toBeDefined();
      expect(userTable.name).toBe('users');
    });

    it('should check if table exists', async () => {
      // Table doesn't exist initially
      expect(await database.hasTable('users')).toBe(false);
      
      // Access table (auto-creates in memory adapter)
      database.table('users');
      
      expect(await database.hasTable('users')).toBe(true);
    });

    it('should create table with schema', async () => {
      const userSchema = {
        name: 'users',
        fields: {
          id: { type: 'string' as const, required: true },
          email: { type: 'string' as const, required: true, unique: true },
          firstName: { type: 'string' as const, required: true },
          lastName: { type: 'string' as const, required: true },
          role: { type: 'string' as const, required: true },
          isActive: { type: 'boolean' as const, required: true },
          createdAt: { type: 'date' as const, required: true },
          updatedAt: { type: 'date' as const, required: true }
        }
      };

      await database.createTable(userSchema);
      
      expect(await database.hasTable('users')).toBe(true);
      
      const schemas = await database.getSchema();
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
    });

    it('should drop tables', async () => {
      await database.createTable({
        name: 'temp_table',
        fields: { id: { type: 'string', required: true } }
      });
      
      expect(await database.hasTable('temp_table')).toBe(true);
      
      await database.dropTable('temp_table');
      
      expect(await database.hasTable('temp_table')).toBe(false);
    });
  });

  describe('CRUD Operations', () => {
    let userTable: any;

    beforeEach(async () => {
      await database.connect();
      userTable = database.table<TestUser>('users');
    });

    it('should create records', async () => {
      const userData = {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const,
        isActive: true
      };

      const user = await userTable.create(userData);

      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should read records by ID', async () => {
      const userData = {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'admin' as const,
        isActive: true
      };

      const created = await userTable.create(userData);
      const found = await userTable.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should update records', async () => {
      const userData = {
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Jones',
        role: 'user' as const,
        isActive: true
      };

      const created = await userTable.create(userData);
      const updated = await userTable.update(created.id, {
        firstName: 'Robert',
        isActive: false
      });

      expect(updated.firstName).toBe('Robert');
      expect(updated.isActive).toBe(false);
      expect(updated.lastName).toBe('Jones'); // Unchanged
      expect(updated.updatedAt).not.toEqual(created.updatedAt);
    });

    it('should delete records', async () => {
      const userData = {
        email: 'delete@example.com',
        firstName: 'Delete',
        lastName: 'Me',
        role: 'user' as const,
        isActive: true
      };

      const created = await userTable.create(userData);
      const deleted = await userTable.delete(created.id);

      expect(deleted).toBe(true);
      
      const found = await userTable.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('Query Builder', () => {
    let userTable: any;

    beforeEach(async () => {
      await database.connect();
      userTable = database.table<TestUser>('users');

      // Create test data
      await userTable.createMany([
        {
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          role: 'admin',
          isActive: true
        },
        {
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Jones',
          role: 'user',
          isActive: true
        },
        {
          email: 'charlie@example.com',
          firstName: 'Charlie',
          lastName: 'Brown',
          role: 'user',
          isActive: false
        }
      ]);
    });

    it('should filter with where clauses', async () => {
      const activeUsers = await userTable.query()
        .where('isActive', '=', true)
        .get();

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every((user: TestUser) => user.isActive)).toBe(true);
    });

    it('should chain multiple where clauses', async () => {
      const activeRegularUsers = await userTable.query()
        .where('isActive', '=', true)
        .where('role', '=', 'user')
        .get();

      expect(activeRegularUsers).toHaveLength(1);
      expect(activeRegularUsers[0].firstName).toBe('Bob');
    });

    it('should use IN operator', async () => {
      const usersAndAdmins = await userTable.query()
        .whereIn('role', ['user', 'admin'])
        .get();

      expect(usersAndAdmins).toHaveLength(3);
    });

    it('should sort results', async () => {
      const usersByName = await userTable.query()
        .orderBy('firstName', 'asc')
        .get();

      expect(usersByName[0].firstName).toBe('Alice');
      expect(usersByName[1].firstName).toBe('Bob');
      expect(usersByName[2].firstName).toBe('Charlie');

      const usersByNameDesc = await userTable.query()
        .orderBy('firstName', 'desc')
        .get();

      expect(usersByNameDesc[0].firstName).toBe('Charlie');
      expect(usersByNameDesc[1].firstName).toBe('Bob');
      expect(usersByNameDesc[2].firstName).toBe('Alice');
    });

    it('should limit results', async () => {
      const limitedUsers = await userTable.query()
        .limit(2)
        .get();

      expect(limitedUsers).toHaveLength(2);
    });

    it('should offset results', async () => {
      const allUsers = await userTable.query().get();
      const offsetUsers = await userTable.query()
        .offset(1)
        .get();

      expect(offsetUsers).toHaveLength(allUsers.length - 1);
    });

    it('should select specific fields', async () => {
      const usersWithLimitedFields = await userTable.query()
        .select(['firstName', 'email'])
        .get();

      expect(usersWithLimitedFields).toHaveLength(3);
      expect(usersWithLimitedFields[0]).toHaveProperty('firstName');
      expect(usersWithLimitedFields[0]).toHaveProperty('email');
      expect(usersWithLimitedFields[0]).not.toHaveProperty('lastName');
    });

    it('should get first result', async () => {
      const firstUser = await userTable.query()
        .orderBy('firstName', 'asc')
        .first();

      expect(firstUser).toBeDefined();
      expect(firstUser.firstName).toBe('Alice');
    });

    it('should return null when no first result', async () => {
      const noUser = await userTable.query()
        .where('email', '=', 'nonexistent@example.com')
        .first();

      expect(noUser).toBeNull();
    });

    it('should count results', async () => {
      const totalCount = await userTable.query().count();
      expect(totalCount).toBe(3);

      const activeCount = await userTable.query()
        .where('isActive', '=', true)
        .count();
      expect(activeCount).toBe(2);
    });

    it('should paginate results', async () => {
      const page1 = await userTable.query()
        .orderBy('firstName', 'asc')
        .paginate(1, 2);

      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(2);
      expect(page1.pages).toBe(2);

      const page2 = await userTable.query()
        .orderBy('firstName', 'asc')
        .paginate(2, 2);

      expect(page2.data).toHaveLength(1);
      expect(page2.page).toBe(2);
    });

    it('should update with query builder', async () => {
      const updatedCount = await userTable.query()
        .where('role', '=', 'user')
        .update({ isActive: false });

      expect(updatedCount).toBe(2);

      const inactiveUsers = await userTable.query()
        .where('isActive', '=', false)
        .get();

      expect(inactiveUsers).toHaveLength(3); // 2 updated + 1 already inactive
    });

    it('should delete with query builder', async () => {
      const deletedCount = await userTable.query()
        .where('isActive', '=', false)
        .delete();

      expect(deletedCount).toBe(1);

      const remainingUsers = await userTable.query().get();
      expect(remainingUsers).toHaveLength(2);
    });

    it('should generate SQL representation', () => {
      const sqlInfo = userTable.query()
        .where('isActive', '=', true)
        .where('role', 'IN', ['user', 'admin'])
        .orderBy('firstName', 'asc')
        .limit(10)
        .toSql();

      expect(sqlInfo.query).toContain('SELECT');
      expect(sqlInfo.query).toContain('WHERE');
      expect(sqlInfo.query).toContain('ORDER BY');
      expect(sqlInfo.query).toContain('LIMIT');
      expect(sqlInfo.bindings).toEqual([true, ['user', 'admin']]);
    });
  });

  describe('Advanced Features', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should handle raw queries gracefully', async () => {
      const userTable = database.table('users');
      
      const result = await userTable.raw('SELECT * FROM users');
      
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.command).toBe('SELECT * FROM users');
    });

    it('should truncate tables', async () => {
      const userTable = database.table<TestUser>('users');
      
      await userTable.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      expect(await userTable.count()).toBe(1);
      
      await userTable.truncate();
      
      expect(await userTable.count()).toBe(0);
    });

    it('should get distinct values', async () => {
      const userTable = database.table<TestUser>('users');
      
      await userTable.createMany([
        {
          email: 'user1@example.com',
          firstName: 'User1',
          lastName: 'Test',
          role: 'user',
          isActive: true
        },
        {
          email: 'user2@example.com',
          firstName: 'User2',
          lastName: 'Test',
          role: 'admin',
          isActive: true
        },
        {
          email: 'user3@example.com',
          firstName: 'User3',
          lastName: 'Test',
          role: 'user',
          isActive: false
        }
      ]);

      const roles = await userTable.distinct('role');
      
      expect(roles).toHaveLength(2);
      expect(roles).toContain('user');
      expect(roles).toContain('admin');
    });

    it('should pluck specific field values', async () => {
      const userTable = database.table<TestUser>('users');
      
      await userTable.createMany([
        {
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          role: 'user',
          isActive: true
        },
        {
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Jones',
          role: 'admin',
          isActive: true
        }
      ]);

      const emails = await userTable.pluck('email');
      
      expect(emails).toHaveLength(2);
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should backup database', async () => {
      const userTable = database.table<TestUser>('users');
      
      await userTable.create({
        email: 'backup@example.com',
        firstName: 'Backup',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      const backup = await database.backup();
      
      expect(backup).toBeDefined();
      expect(typeof backup).toBe('string');
      
      const backupData = JSON.parse(backup);
      expect(backupData).toHaveProperty('version');
      expect(backupData).toHaveProperty('timestamp');
      expect(backupData).toHaveProperty('data');
      expect(backupData.data.users).toHaveLength(1);
    });

    it('should restore database from backup', async () => {
      const userTable = database.table<TestUser>('users');
      
      // Create initial data
      await userTable.create({
        email: 'original@example.com',
        firstName: 'Original',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      // Create backup
      const backup = await database.backup();
      
      // Clear data
      await userTable.truncate();
      expect(await userTable.count()).toBe(0);
      
      // Restore from backup
      await database.restore(backup);
      
      const restoredUsers = await userTable.findMany();
      expect(restoredUsers).toHaveLength(1);
      expect(restoredUsers[0].email).toBe('original@example.com');
    });
  });

  describe('Performance and Analysis', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should analyze database', async () => {
      const userTable = database.table<TestUser>('users');
      const postTable = database.table('posts');
      
      // Add some data
      await userTable.createMany([
        {
          email: 'user1@example.com',
          firstName: 'User1',
          lastName: 'Test',
          role: 'user',
          isActive: true
        },
        {
          email: 'user2@example.com',
          firstName: 'User2',
          lastName: 'Test',
          role: 'admin',
          isActive: true
        }
      ]);

      await postTable.create({
        title: 'Test Post',
        content: 'Test content',
        authorId: 'user1'
      });

      const analysis = await database.analyze();
      
      expect(analysis).toHaveProperty('tables');
      expect(analysis.tables).toHaveLength(2);
      
      const usersTable = analysis.tables.find((t: any) => t.name === 'users');
      const postsTable = analysis.tables.find((t: any) => t.name === 'posts');
      
      expect(usersTable.rowCount).toBe(2);
      expect(postsTable.rowCount).toBe(1);
      expect(usersTable.size).toMatch(/\d+(\.\d+)?\s(B|KB|MB)/);
    });

    it('should handle large datasets efficiently', async () => {
      const userTable = database.table<TestUser>('users');
      
      const startTime = performance.now();
      
      // Create 1000 users
      const users = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@example.com`,
        firstName: `User${i}`,
        lastName: 'Test',
        role: (i % 3 === 0 ? 'admin' : 'user') as const,
        isActive: i % 2 === 0
      }));

      const result = await userTable.createMany(users);
      
      const createTime = performance.now() - startTime;
      
      expect(result.successCount).toBe(1000);
      expect(createTime).toBeLessThan(1000); // Should complete in less than 1 second
      
      // Query performance test
      const queryStart = performance.now();
      const activeUsers = await userTable.query()
        .where('isActive', '=', true)
        .orderBy('firstName', 'asc')
        .limit(50)
        .get();
      
      const queryTime = performance.now() - queryStart;
      
      expect(activeUsers).toHaveLength(50);
      expect(queryTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await database.connect();
    });

    it('should handle invalid operations gracefully', async () => {
      const userTable = database.table<TestUser>('users');
      
      // Try to update non-existent record
      await expect(
        userTable.update('non-existent-id', { firstName: 'Updated' })
      ).rejects.toThrow();
      
      // Try to delete non-existent record
      const deleteResult = await userTable.delete('non-existent-id');
      expect(deleteResult).toBe(false);
    });

    it('should handle schema validation errors', async () => {
      const invalidSchema = {
        name: '', // Empty name
        fields: {} // No fields
      };

      const validation = await database.validateSchema(invalidSchema);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle concurrent operations', async () => {
      const userTable = database.table<TestUser>('users');
      
      // Create multiple users concurrently
      const promises = Array.from({ length: 100 }, (_, i) =>
        userTable.create({
          email: `concurrent${i}@example.com`,
          firstName: `User${i}`,
          lastName: 'Test',
          role: 'user',
          isActive: true
        })
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      expect(results.every(user => user.id)).toBe(true);
      
      const count = await userTable.count();
      expect(count).toBe(100);
    });
  });
});