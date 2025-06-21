/**
 * Memory CRUD Service Tests
 * 
 * Tests for the in-memory CRUD service implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestUtils, TEST_CONSTANTS } from '../../test/setup';
import { MemoryCrudService } from '../memory-crud.service';
import { BaseEntity } from '../crud.interface';

interface TestUser extends BaseEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
}

describe('MemoryCrudService', () => {
  let crudService: MemoryCrudService<TestUser>;
  let mockCache: any;

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
      invalidatePattern: vi.fn(),
    };
    
    crudService = new MemoryCrudService<TestUser>({
      entityName: 'user',
      cache: true,
      cacheTTL: TEST_CONSTANTS.CACHE_TTL,
      softDelete: false,
      generateId: () => `test-${Date.now()}-${Math.random()}`
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Create Operations', () => {
    it('should create a new entity', async () => {
      const userData = {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const,
        isActive: true
      };

      const user = await crudService.create(userData);

      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt).toEqual(user.updatedAt);
    });

    it('should create multiple entities', async () => {
      const usersData = [
        {
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'user' as const,
          isActive: true
        },
        {
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'admin' as const,
          isActive: false
        }
      ];

      const result = await crudService.createMany(usersData);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0].email).toBe('user1@example.com');
      expect(result.successful[1].email).toBe('user2@example.com');
    });

    it('should handle creation errors in batch operations', async () => {
      // Mock validation to fail for specific email
      const originalCreate = crudService.create.bind(crudService);
      vi.spyOn(crudService, 'create').mockImplementation(async (data: any) => {
        if (data.email === 'invalid@example.com') {
          throw new Error('Invalid email');
        }
        return originalCreate(data);
      });

      const usersData = [
        {
          email: 'valid@example.com',
          firstName: 'Valid',
          lastName: 'User',
          role: 'user' as const,
          isActive: true
        },
        {
          email: 'invalid@example.com',
          firstName: 'Invalid',
          lastName: 'User',
          role: 'user' as const,
          isActive: true
        }
      ];

      const result = await crudService.createMany(usersData);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Invalid email');
    });
  });

  describe('Read Operations', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await crudService.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        age: 25
      });
    });

    it('should find entity by ID', async () => {
      const found = await crudService.findById(testUser.id);
      
      expect(found).toEqual(testUser);
    });

    it('should return null for non-existent ID', async () => {
      const found = await crudService.findById('non-existent-id');
      
      expect(found).toBeNull();
    });

    it('should find one entity by filter', async () => {
      const found = await crudService.findOne({ email: 'test@example.com' });
      
      expect(found).toEqual(testUser);
    });

    it('should return null when no entity matches filter', async () => {
      const found = await crudService.findOne({ email: 'notfound@example.com' });
      
      expect(found).toBeNull();
    });

    it('should find multiple entities with filters', async () => {
      // Create additional users
      await crudService.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        age: 30
      });

      await crudService.create({
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        role: 'guest',
        isActive: false,
        age: 20
      });

      // Find active users
      const activeUsers = await crudService.findMany({
        filter: { isActive: true }
      });

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.isActive)).toBe(true);

      // Find users by role
      const adminUsers = await crudService.findMany({
        filter: { role: 'admin' }
      });

      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].role).toBe('admin');
    });

    it('should sort results', async () => {
      // Create users with different names
      await crudService.create({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'user',
        isActive: true
      });

      await crudService.create({
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Jones',
        role: 'user',
        isActive: true
      });

      // Sort by firstName ascending
      const usersAsc = await crudService.findMany({
        sort: { field: 'firstName', direction: 'asc' }
      });

      expect(usersAsc[0].firstName).toBe('Alice');
      expect(usersAsc[1].firstName).toBe('Bob');
      expect(usersAsc[2].firstName).toBe('Test');

      // Sort by firstName descending
      const usersDesc = await crudService.findMany({
        sort: { field: 'firstName', direction: 'desc' }
      });

      expect(usersDesc[0].firstName).toBe('Test');
      expect(usersDesc[1].firstName).toBe('Bob');
      expect(usersDesc[2].firstName).toBe('Alice');
    });

    it('should paginate results', async () => {
      // Create more users for pagination
      for (let i = 0; i < 10; i++) {
        await crudService.create({
          email: `user${i}@example.com`,
          firstName: `User${i}`,
          lastName: 'Test',
          role: 'user',
          isActive: true
        });
      }

      const result = await crudService.findPaginated({
        pagination: { page: 1, limit: 5 },
        sort: { field: 'firstName', direction: 'asc' }
      });

      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(11); // 10 created + 1 from beforeEach
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.pages).toBe(3);

      // Get second page
      const page2 = await crudService.findPaginated({
        pagination: { page: 2, limit: 5 },
        sort: { field: 'firstName', direction: 'asc' }
      });

      expect(page2.data).toHaveLength(5);
      expect(page2.page).toBe(2);
      expect(page2.data[0].firstName).not.toBe(result.data[0].firstName);
    });
  });

  describe('Update Operations', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await crudService.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });
    });

    it('should update existing entity', async () => {
      const originalUpdatedAt = testUser.updatedAt;
      
      // Wait a bit to ensure different timestamp
      vi.advanceTimersByTime(100);

      const updated = await crudService.update(testUser.id, {
        firstName: 'Updated',
        isActive: false
      });

      expect(updated.id).toBe(testUser.id);
      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('User'); // Unchanged
      expect(updated.isActive).toBe(false);
      expect(updated.updatedAt).not.toEqual(originalUpdatedAt);
      expect(updated.createdAt).toEqual(testUser.createdAt); // Should not change
    });

    it('should throw error when updating non-existent entity', async () => {
      await expect(
        crudService.update('non-existent-id', { firstName: 'Updated' })
      ).rejects.toThrow('user with id non-existent-id not found');
    });

    it('should update multiple entities', async () => {
      // Create additional users
      const user2 = await crudService.create({
        email: 'user2@example.com',
        firstName: 'User2',
        lastName: 'Test',
        role: 'user',
        isActive: true
      });

      const user3 = await crudService.create({
        email: 'user3@example.com',
        firstName: 'User3',
        lastName: 'Test',
        role: 'user',
        isActive: true
      });

      // Update all users with role 'user'
      const updatedCount = await crudService.updateMany(
        { role: 'user' },
        { isActive: false }
      );

      expect(updatedCount).toBe(3);

      // Verify updates
      const allUsers = await crudService.findMany();
      expect(allUsers.every(user => !user.isActive)).toBe(true);
    });
  });

  describe('Delete Operations', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      testUser = await crudService.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });
    });

    it('should delete existing entity', async () => {
      const result = await crudService.delete(testUser.id);
      
      expect(result).toBe(true);
      
      const found = await crudService.findById(testUser.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent entity', async () => {
      const result = await crudService.delete('non-existent-id');
      
      expect(result).toBe(false);
    });

    it('should delete multiple entities', async () => {
      // Create additional users
      await crudService.create({
        email: 'user2@example.com',
        firstName: 'User2',
        lastName: 'Test',
        role: 'user',
        isActive: true
      });

      await crudService.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });

      // Delete all users with role 'user'
      const deletedCount = await crudService.deleteMany({ role: 'user' });
      
      expect(deletedCount).toBe(2);

      // Verify deletions
      const remainingUsers = await crudService.findMany();
      expect(remainingUsers).toHaveLength(1);
      expect(remainingUsers[0].role).toBe('admin');
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      // Create test data
      await crudService.createMany([
        {
          email: 'user1@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          role: 'user',
          isActive: true,
          age: 25
        },
        {
          email: 'user2@example.com',
          firstName: 'Bob',
          lastName: 'Jones',
          role: 'admin',
          isActive: true,
          age: 30
        },
        {
          email: 'user3@example.com',
          firstName: 'Charlie',
          lastName: 'Brown',
          role: 'user',
          isActive: false,
          age: 35
        }
      ]);
    });

    it('should count entities', async () => {
      const totalCount = await crudService.count();
      expect(totalCount).toBe(3);

      const activeCount = await crudService.count({ isActive: true });
      expect(activeCount).toBe(2);

      const userCount = await crudService.count({ role: 'user' });
      expect(userCount).toBe(2);
    });

    it('should check if entities exist', async () => {
      const existsActive = await crudService.exists({ isActive: true });
      expect(existsActive).toBe(true);

      const existsGuest = await crudService.exists({ role: 'guest' });
      expect(existsGuest).toBe(false);
    });

    it('should upsert entities', async () => {
      // Update existing user
      const upserted1 = await crudService.upsert(
        { email: 'user1@example.com' },
        {
          email: 'user1@example.com',
          firstName: 'Alice Updated',
          lastName: 'Smith',
          role: 'admin',
          isActive: true
        }
      );

      expect(upserted1.firstName).toBe('Alice Updated');
      expect(upserted1.role).toBe('admin');

      // Create new user
      const upserted2 = await crudService.upsert(
        { email: 'newuser@example.com' },
        {
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'user',
          isActive: true
        }
      );

      expect(upserted2.email).toBe('newuser@example.com');
      expect(upserted2.firstName).toBe('New');

      const totalCount = await crudService.count();
      expect(totalCount).toBe(4); // 3 original + 1 new
    });
  });

  describe('Event System', () => {
    it('should notify subscribers of changes', async () => {
      const changeEvents: any[] = [];
      
      const unsubscribe = crudService.subscribe((event) => {
        changeEvents.push(event);
      });

      // Create user
      const user = await crudService.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      // Update user
      await crudService.update(user.id, { firstName: 'Updated' });

      // Delete user
      await crudService.delete(user.id);

      expect(changeEvents).toHaveLength(3);
      
      expect(changeEvents[0]).toMatchObject({
        type: 'created',
        entity: expect.objectContaining({ email: 'test@example.com' }),
        source: 'memory'
      });

      expect(changeEvents[1]).toMatchObject({
        type: 'updated',
        entity: expect.objectContaining({ firstName: 'Updated' }),
        source: 'memory'
      });

      expect(changeEvents[2]).toMatchObject({
        type: 'deleted',
        entity: expect.objectContaining({ firstName: 'Updated' }),
        source: 'memory'
      });

      // Unsubscribe should work
      unsubscribe();
      
      await crudService.create({
        email: 'test2@example.com',
        firstName: 'Test2',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      expect(changeEvents).toHaveLength(3); // No new events
    });

    it('should handle subscriber errors gracefully', async () => {
      const errorSubscriber = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      
      const goodSubscriber = vi.fn();

      crudService.subscribe(errorSubscriber);
      crudService.subscribe(goodSubscriber);

      // Should not throw even if subscriber errors
      await expect(crudService.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      })).resolves.toBeDefined();

      expect(errorSubscriber).toHaveBeenCalled();
      expect(goodSubscriber).toHaveBeenCalled();
    });
  });

  describe('Data Management', () => {
    it('should load initial data', async () => {
      const initialData = [
        TestUtils.createTestUser({ id: 'user1', email: 'user1@example.com' }),
        TestUtils.createTestUser({ id: 'user2', email: 'user2@example.com' })
      ] as TestUser[];

      await crudService.loadData(initialData);

      const user1 = await crudService.findById('user1');
      const user2 = await crudService.findById('user2');

      expect(user1).toEqual(initialData[0]);
      expect(user2).toEqual(initialData[1]);

      const count = await crudService.count();
      expect(count).toBe(2);
    });

    it('should export all data', async () => {
      await crudService.createMany([
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
          isActive: false
        }
      ]);

      const exported = await crudService.exportData();
      
      expect(exported).toHaveLength(2);
      expect(exported[0].email).toBe('user1@example.com');
      expect(exported[1].email).toBe('user2@example.com');
    });

    it('should clear all data', async () => {
      await crudService.createMany([
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
          isActive: false
        }
      ]);

      expect(await crudService.count()).toBe(2);

      await crudService.clear();

      expect(await crudService.count()).toBe(0);
    });

    it('should provide memory usage statistics', async () => {
      const stats = crudService.getStats();
      
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('memoryUsage');
      expect(typeof stats.count).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });
  });
});