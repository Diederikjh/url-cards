/**
 * Board utilities for E2E tests
 * Provides helper functions for board operations
 */

import testUtils from './test-utils.js';

const boardUtils = {
  /**
   * Create a new board with retries for stability
   * @param {Page} page - Playwright page object
   * @param {string} boardName - Name for the board
   */
  async createBoard(page, boardName = 'Test Board') {
    console.log(`[TEST] Creating board: "${boardName}"`);
    
    // Wait for and click create board button
    await testUtils.waitForElement(page, '#createBoardBtn', 5000);
    console.log('[TEST] Create board button found');
    
    // Intercept the prompt dialog
    page.once('dialog', dialog => {
      console.log(`[TEST] Dialog appeared: "${dialog.message()}"`);
      dialog.accept(boardName);
      console.log(`[TEST] Dialog accepted with: "${boardName}"`);
    });
    
    await page.click('#createBoardBtn', { timeout: 5000 });
    console.log('[TEST] Create board button clicked');

    // Wait for board name to appear in UI
    await page.waitForFunction(
      (name) => {
        return document.body.innerText.includes(name);
      },
      boardName,
      { timeout: 5000 }
    );
    console.log(`[TEST] Board "${boardName}" appeared in UI`);

    return boardName;
  },

  /**
   * Rename a board
   * @param {Page} page - Playwright page object
   * @param {string} oldName - Current board name
   * @param {string} newName - New board name
   */
  async renameBoard(page, oldName, newName) {
    console.log(`[TEST] Renaming board from "${oldName}" to "${newName}"`);
    
    // Click on board to open it
    await page.click(`text="${oldName}"`, { timeout: 5000 });
    console.log(`[TEST] Clicked on board "${oldName}"`);
    
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {
      console.log('[TEST] No navigation, board might be already open');
    });

    // Click rename button and intercept prompt
    await testUtils.waitForElement(page, '#renameBoardBtn', 5000);
    
    page.once('dialog', dialog => {
      console.log(`[TEST] Rename dialog appeared: "${dialog.message()}"`);
      dialog.accept(newName);
      console.log(`[TEST] Rename dialog accepted with: "${newName}"`);
    });
    
    await page.click('#renameBoardBtn', { timeout: 5000 });
    console.log('[TEST] Rename button clicked');

    // Wait for update to complete
    await page.waitForTimeout(500);
  },

  /**
   * Delete a board
   * @param {Page} page - Playwright page object
   * @param {string} boardName - Name of board to delete
   */
  async deleteBoard(page, boardName) {
    console.log(`[TEST] Deleting board: "${boardName}"`);
    
    // Click on board to open it
    await page.click(`text="${boardName}"`, { timeout: 5000 });
    console.log(`[TEST] Clicked on board "${boardName}"`);
    
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});

    // Click delete button and intercept confirm dialog
    await testUtils.waitForElement(page, '#deleteBoardBtn', 5000);
    
    page.once('dialog', dialog => {
      console.log(`[TEST] Delete confirm dialog: "${dialog.message()}"`);
      dialog.accept();
      console.log('[TEST] Delete confirmed');
    });
    
    await page.click('#deleteBoardBtn', { timeout: 5000 });
    console.log('[TEST] Delete button clicked');

    // Wait for navigation back to boards list
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  },

  /**
   * Navigate to a board by name
   * @param {Page} page - Playwright page object
   * @param {string} boardName - Name of board to navigate to
   */
  async navigateToBoard(page, boardName) {
    console.log(`[TEST] Navigating to board: "${boardName}"`);
    
    await page.click(`text="${boardName}"`, { timeout: 5000 });
    
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {
      console.log('[TEST] No navigation, board already open');
    });

    await testUtils.waitForElement(page, '#boardName', 5000);
    console.log(`[TEST] Navigated to board: "${boardName}"`);
  },

  /**
   * Navigate back to boards list
   * @param {Page} page - Playwright page object
   */
  async navigateToBoards(page) {
    console.log('[TEST] Navigating back to boards list');
    
    await page.evaluate(() => {
      window.location.hash = '#boards';
    });
    
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      return boardsView && window.getComputedStyle(boardsView).display !== 'none';
    }, { timeout: 5000 });

    console.log('[TEST] Back at boards list');
  },
};

export default boardUtils;
