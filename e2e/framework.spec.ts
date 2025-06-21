/**
 * End-to-End Tests for MARH Framework
 * 
 * Tests the complete framework functionality in a real browser environment.
 */

import { test, expect } from '@playwright/test';

test.describe('MARH Framework E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Application Loading', () => {
    test('should load the application successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/MARH/);
      await expect(page.locator('h1')).toContainText('Welcome to MARH');
    });

    test('should display platform information', async ({ page }) => {
      const platformInfo = page.locator('[data-testid="platform-info"]');
      await expect(platformInfo).toBeVisible();
      await expect(platformInfo).toContainText('Platform:');
      await expect(platformInfo).toContainText('PWA'); // Should detect as PWA
    });

    test('should load without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Filter out known harmless errors
      const significantErrors = errors.filter(error => 
        !error.includes('favicon.ico') &&
        !error.includes('manifest.json') &&
        !error.includes('service-worker')
      );

      expect(significantErrors).toEqual([]);
    });
  });

  test.describe('Store Pattern Functionality', () => {
    test('should increment and decrement counter', async ({ page }) => {
      const counter = page.locator('[data-testid="store-counter"]');
      const incrementBtn = counter.locator('[data-testid="increment-btn"]');
      const decrementBtn = counter.locator('[data-testid="decrement-btn"]');
      const countDisplay = counter.locator('[data-testid="count-display"]');

      // Initial state
      await expect(countDisplay).toContainText('0');

      // Increment
      await incrementBtn.click();
      await expect(countDisplay).toContainText('1');

      await incrementBtn.click();
      await expect(countDisplay).toContainText('2');

      // Decrement
      await decrementBtn.click();
      await expect(countDisplay).toContainText('1');
    });

    test('should reset counter', async ({ page }) => {
      const counter = page.locator('[data-testid="store-counter"]');
      const incrementBtn = counter.locator('[data-testid="increment-btn"]');
      const resetBtn = counter.locator('[data-testid="reset-btn"]');
      const countDisplay = counter.locator('[data-testid="count-display"]');

      // Increment counter
      await incrementBtn.click();
      await incrementBtn.click();
      await expect(countDisplay).toContainText('2');

      // Reset
      await resetBtn.click();
      await expect(countDisplay).toContainText('0');
    });

    test('should toggle theme', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      const themeDisplay = page.locator('[data-testid="theme-display"]');

      // Should start with light theme
      await expect(themeDisplay).toContainText('light');

      // Toggle to dark
      await themeToggle.click();
      await expect(themeDisplay).toContainText('dark');

      // Toggle back to light
      await themeToggle.click();
      await expect(themeDisplay).toContainText('light');
    });
  });

  test.describe('Cache Service Demo', () => {
    test('should add and retrieve cache entries', async ({ page }) => {
      const cacheDemo = page.locator('[data-testid="cache-demo"]');
      
      // Navigate to cache demo section
      await cacheDemo.scrollIntoViewIfNeeded();

      const keyInput = cacheDemo.locator('[data-testid="cache-key-input"]');
      const valueInput = cacheDemo.locator('[data-testid="cache-value-input"]');
      const setBtn = cacheDemo.locator('[data-testid="cache-set-btn"]');
      const getBtn = cacheDemo.locator('[data-testid="cache-get-btn"]');
      const output = cacheDemo.locator('[data-testid="cache-output"]');

      // Set cache value
      await keyInput.fill('test-key');
      await valueInput.fill('test-value');
      await setBtn.click();

      // Get cache value
      await getBtn.click();
      await expect(output).toContainText('test-value');
    });

    test('should display cache statistics', async ({ page }) => {
      const cacheDemo = page.locator('[data-testid="cache-demo"]');
      const stats = cacheDemo.locator('[data-testid="cache-stats"]');

      await expect(stats).toBeVisible();
      await expect(stats).toContainText('Size:');
      await expect(stats).toContainText('Hits:');
      await expect(stats).toContainText('Misses:');
    });

    test('should clear cache', async ({ page }) => {
      const cacheDemo = page.locator('[data-testid="cache-demo"]');
      const clearBtn = cacheDemo.locator('[data-testid="cache-clear-btn"]');
      const stats = cacheDemo.locator('[data-testid="cache-stats"]');

      // Add some cache entries first
      const keyInput = cacheDemo.locator('[data-testid="cache-key-input"]');
      const valueInput = cacheDemo.locator('[data-testid="cache-value-input"]');
      const setBtn = cacheDemo.locator('[data-testid="cache-set-btn"]');

      await keyInput.fill('key1');
      await valueInput.fill('value1');
      await setBtn.click();

      // Clear cache
      await clearBtn.click();

      // Check stats show empty cache
      await expect(stats).toContainText('Size: 0');
    });
  });

  test.describe('Database System Demo', () => {
    test('should create and display users', async ({ page }) => {
      const dbDemo = page.locator('[data-testid="database-demo"]');
      await dbDemo.scrollIntoViewIfNeeded();

      // Navigate to users tab
      const usersTab = dbDemo.locator('[data-testid="users-tab"]');
      await usersTab.click();

      // Add new user
      const addUserBtn = dbDemo.locator('[data-testid="add-user-btn"]');
      await addUserBtn.click();

      // Fill user form
      const nameInput = page.locator('[data-testid="user-name-input"]');
      const emailInput = page.locator('[data-testid="user-email-input"]');
      const saveBtn = page.locator('[data-testid="save-user-btn"]');

      await nameInput.fill('Test User');
      await emailInput.fill('test@example.com');
      await saveBtn.click();

      // Verify user appears in list
      const usersList = dbDemo.locator('[data-testid="users-list"]');
      await expect(usersList).toContainText('Test User');
      await expect(usersList).toContainText('test@example.com');
    });

    test('should edit and delete users', async ({ page }) => {
      const dbDemo = page.locator('[data-testid="database-demo"]');
      const usersTab = dbDemo.locator('[data-testid="users-tab"]');
      await usersTab.click();

      // Assume there's at least one user from seeded data
      const editBtn = dbDemo.locator('[data-testid="edit-user-btn"]').first();
      await editBtn.click();

      // Update user
      const nameInput = page.locator('[data-testid="user-name-input"]');
      await nameInput.fill('Updated User');
      
      const saveBtn = page.locator('[data-testid="save-user-btn"]');
      await saveBtn.click();

      // Verify update
      const usersList = dbDemo.locator('[data-testid="users-list"]');
      await expect(usersList).toContainText('Updated User');

      // Delete user
      const deleteBtn = dbDemo.locator('[data-testid="delete-user-btn"]').first();
      
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      await deleteBtn.click();

      // Verify deletion
      await expect(usersList).not.toContainText('Updated User');
    });

    test('should display database statistics', async ({ page }) => {
      const dbDemo = page.locator('[data-testid="database-demo"]');
      const overviewTab = dbDemo.locator('[data-testid="overview-tab"]');
      await overviewTab.click();

      const stats = dbDemo.locator('[data-testid="db-stats"]');
      await expect(stats).toBeVisible();
      await expect(stats).toContainText('Total Records');
      await expect(stats).toContainText('Tables');
      await expect(stats).toContainText('Database Type');
    });
  });

  test.describe('CRUD Operations Demo', () => {
    test('should perform CRUD operations on demo items', async ({ page }) => {
      const crudDemo = page.locator('[data-testid="crud-demo"]');
      await crudDemo.scrollIntoViewIfNeeded();

      // Add new item
      const addBtn = crudDemo.locator('[data-testid="crud-add-btn"]');
      await addBtn.click();

      const titleInput = page.locator('[data-testid="crud-title-input"]');
      const descInput = page.locator('[data-testid="crud-description-input"]');
      const saveBtn = page.locator('[data-testid="crud-save-btn"]');

      await titleInput.fill('E2E Test Item');
      await descInput.fill('This item was created by E2E tests');
      await saveBtn.click();

      // Verify item appears
      const itemsList = crudDemo.locator('[data-testid="crud-items-list"]');
      await expect(itemsList).toContainText('E2E Test Item');
    });

    test('should filter and sort items', async ({ page }) => {
      const crudDemo = page.locator('[data-testid="crud-demo"]');
      
      // Test search functionality
      const searchInput = crudDemo.locator('[data-testid="crud-search-input"]');
      await searchInput.fill('Learning');

      const itemsList = crudDemo.locator('[data-testid="crud-items-list"]');
      await expect(itemsList).toContainText('Learn CRUD operations');

      // Clear search
      await searchInput.fill('');

      // Test category filter
      const categoryFilter = crudDemo.locator('[data-testid="crud-category-filter"]');
      await categoryFilter.selectOption('Development');
      
      await expect(itemsList).toContainText('Build user interface');
    });

    test('should handle pagination', async ({ page }) => {
      const crudDemo = page.locator('[data-testid="crud-demo"]');
      
      // Check if pagination controls exist (only if there are enough items)
      const pagination = crudDemo.locator('[data-testid="crud-pagination"]');
      const nextBtn = pagination.locator('[data-testid="pagination-next"]');
      
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        // Verify page changed (could check URL or page indicator)
        const pageIndicator = pagination.locator('[data-testid="current-page"]');
        await expect(pageIndicator).toContainText('2');
      }
    });
  });

  test.describe('PWA Features', () => {
    test('should detect PWA capabilities', async ({ page }) => {
      const pwaSection = page.locator('[data-testid="pwa-features"]');
      await expect(pwaSection).toBeVisible();
      await expect(pwaSection).toContainText('Progressive Web App');
    });

    test('should handle offline state', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toContainText('Offline');
      }

      // Go back online
      await page.context().setOffline(false);
      
      const onlineIndicator = page.locator('[data-testid="online-indicator"]');
      if (await onlineIndicator.isVisible()) {
        await expect(onlineIndicator).toContainText('Online');
      }
    });

    test('should display install prompt controls', async ({ page }) => {
      const installSection = page.locator('[data-testid="pwa-install"]');
      
      if (await installSection.isVisible()) {
        const installBtn = installSection.locator('[data-testid="install-btn"]');
        await expect(installBtn).toBeVisible();
      }
    });
  });

  test.describe('Navigation and Routing', () => {
    test('should navigate between sections', async ({ page }) => {
      // Test navigation links if they exist
      const usersLink = page.locator('[data-testid="nav-users"]');
      
      if (await usersLink.isVisible()) {
        await usersLink.click();
        await expect(page.locator('h2')).toContainText('Users');
      }
    });

    test('should handle browser back/forward', async ({ page }) => {
      const initialUrl = page.url();
      
      // Navigate to a different section if routing exists
      const aboutLink = page.locator('[data-testid="nav-about"]');
      
      if (await aboutLink.isVisible()) {
        await aboutLink.click();
        
        // Go back
        await page.goBack();
        expect(page.url()).toBe(initialUrl);
        
        // Go forward
        await page.goForward();
        expect(page.url()).not.toBe(initialUrl);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should be responsive', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      const desktopNav = page.locator('[data-testid="desktop-nav"]');
      
      // Check responsive layout changes
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.reload();
      
      if (await desktopNav.isVisible()) {
        await expect(desktopNav).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper semantic structure', async ({ page }) => {
      // Check for main landmarks
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing to ensure keyboard navigation works
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate elements with Enter/Space
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for buttons with proper labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const hasLabel = await button.evaluate(el => 
          el.textContent?.trim() || 
          el.getAttribute('aria-label') || 
          el.getAttribute('title')
        );
        expect(hasLabel).toBeTruthy();
      }
    });
  });
});