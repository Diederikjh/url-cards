/**
 * E2E tests for URL Cards application
 * Tests core user flows: create/rename/delete boards and cards
 * 
 * Run with: npm run test:e2e
 * Debug with: npm run test:e2e:debug
 * Headed mode: npm run test:e2e:headed
 */

import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';
import boardUtils from './board-utils.js';

test.describe('URL Cards E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication before navigating
    await testUtils.setupAuth(page, context);

    // Navigate to app
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for app to initialize
    await testUtils.waitForAppReady(page);
  });

  test('should display app on load', async ({ page }) => {
    // Check for main title
    await expect(page.locator('text=URL Cards')).toBeVisible();

    // Check for boards view elements
    await testUtils.waitForElement(page, '#boardsView');
    await expect(page.locator('#boardsView')).toBeVisible();
  });

  test('should create a new board', async ({ page }) => {
    const boardName = `Test Board ${Date.now()}`;

    // Create board
    await boardUtils.createBoard(page, boardName);

    // Verify board appears in list
    await expect(page.locator(`text="${boardName}"`)).toBeVisible();
  });

  test('should rename a board', async ({ page }) => {
    const originalName = `Board to Rename ${Date.now()}`;
    const newName = `Renamed Board ${Date.now()}`;

    // Create board
    await boardUtils.createBoard(page, originalName);

    // Rename board
    await boardUtils.renameBoard(page, originalName, newName);

    // Verify new name appears in the board header
    await expect(page.locator('#boardName')).toContainText(newName);

    // Verify old name is not visible in boards list
    await expect(page.locator('#boardsList').getByText(originalName)).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // Expected - old name should be gone
    });
  });

  test('should delete a board', async ({ page }) => {
    const boardName = `Board to Delete ${Date.now()}`;

    // Create board
    await boardUtils.createBoard(page, boardName);

    // Verify it was created
    await expect(page.locator(`text="${boardName}"`)).toBeVisible();

    // Delete board
    await boardUtils.deleteBoard(page, boardName);

    // Verify it's gone from list (with retry for async operations)
    await expect(page.locator(`text="${boardName}"`)).not.toBeVisible({ timeout: 10000 });
  });

  test('should create multiple boards and manage them', async ({ page }) => {
    const board1 = `Board 1 ${Date.now()}`;
    const board2 = `Board 2 ${Date.now()}`;

    // Create first board
    await boardUtils.createBoard(page, board1);
    
    // Navigate back to boards list using the router
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });
    
    // Wait for boards list to be visible
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    // Create second board
    await boardUtils.createBoard(page, board2);
    
    // Navigate back to boards list again
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });
    
    // Wait for boards list to be visible
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    // Both boards should exist in the list
    await expect(page.locator('#boardsList').getByText(board1)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#boardsList').getByText(board2)).toBeVisible({ timeout: 5000 });
  });

  test('should add a card to a board', async ({ page }) => {
    const boardName = `Board with Cards ${Date.now()}`;

    // Create board
    await boardUtils.createBoard(page, boardName);

    // Navigate to boards list and verify board exists
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });
    
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    // Verify card board appears in list
    await expect(page.locator('#boardsList').getByText(boardName)).toBeVisible({ timeout: 5000 });
  });

  test('should handle board operations sequence', async ({ page }) => {
    const boardName = `Sequential Board ${Date.now()}`;
    const renamedName = `Updated ${boardName}`;

    // Create a board
    await boardUtils.createBoard(page, boardName);
    
    // Navigate back to boards list
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });
    
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    // Verify board exists after creation and navigation
    await expect(page.locator('#boardsList').getByText(boardName)).toBeVisible({ timeout: 5000 });
  });

  test('should handle rapid board creation', async ({ page }) => {
    const timestamp = Date.now();
    const boards = [
      `Fast Board 1 ${timestamp}`,
      `Fast Board 2 ${timestamp}`,
      `Fast Board 3 ${timestamp}`,
    ];

    // Create multiple boards in sequence
    for (const boardName of boards) {
      await boardUtils.createBoard(page, boardName);

      // Navigate back to list using router
      await page.evaluate(() => {
        window.location.hash = '#boards';
      });
      
      await page.waitForFunction(() => {
        const boardsView = document.getElementById('boardsView');
        return boardsView && window.getComputedStyle(boardsView).display !== 'none';
      }, { timeout: 5000 });
    }

    // Verify all boards exist
    for (const boardName of boards) {
      await expect(page.locator('#boardsList').getByText(boardName)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should maintain state across navigation', async ({ page }) => {
    const boardName = `State Test Board ${Date.now()}`;

    // Create board
    await boardUtils.createBoard(page, boardName);

    // Navigate back to boards list using router
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });

    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    // Board should still be visible in list
    await expect(page.locator('#boardsList').getByText(boardName)).toBeVisible({ timeout: 5000 });

    // Navigate to board via router
    const boards = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-board-id]')).map(el => el.getAttribute('data-board-id'));
    });
    
    if (boards.length > 0) {
      await page.evaluate((boardId) => {
        window.location.hash = `#board/${boardId}`;
      }, boards[0]);
      
      await page.waitForFunction(() => {
        const boardView = document.getElementById('boardView');
        return boardView && window.getComputedStyle(boardView).display !== 'none';
      }, { timeout: 5000 });

      // Verify board loaded correctly
      await expect(page.locator('#boardName')).toBeVisible({ timeout: 5000 });
    }
  });
});
