/**
 * Card utilities for E2E tests
 * Provides helper functions for card operations
 */

import testUtils from './test-utils.js';
import { expect } from '@playwright/test';

const cardUtils = {
  /**
   * Add a card to current board
   * @param {Page} page - Playwright page object
   * @param {string} url - URL for the card
   * @param {string} boardName - Optional: name of board to ensure we're on
   */
  async addCard(page, url = 'https://example.com', boardName = null) {
    console.log(`[TEST] Adding card with URL: "${url}"`);

    // Check if board view is visible, if not navigate to first board
    const isBoardViewVisible = await page.evaluate(() => {
      const boardView = document.getElementById('boardView');
      return boardView && window.getComputedStyle(boardView).display !== 'none';
    });

    if (!isBoardViewVisible) {
      console.log('[TEST] Board view not visible, navigating to board');

      // If we know the board name, click on it specifically
      if (boardName) {
        await page.click(`text="${boardName}"`, { timeout: 5000 });
        console.log(`[TEST] Clicked on board: "${boardName}"`);
      } else {
        // Otherwise click the first board item
        await page.click('.board-item', { timeout: 5000 });
        console.log('[TEST] Clicked on first board');
      }

      // Wait for board view to become visible
      await page.waitForFunction(() => {
        const boardView = document.getElementById('boardView');
        return boardView && window.getComputedStyle(boardView).display !== 'none';
      }, { timeout: 10000 });
    }

    console.log('[TEST] Board view is visible');

    // Wait a bit for the view to fully render
    await page.waitForTimeout(500);

    // Wait for add card input to be visible
    await page.waitForSelector('#urlInput', { state: 'visible', timeout: 10000 });
    console.log('[TEST] URL input found and visible');

    // Fill in URL
    await page.fill('#urlInput', url);
    console.log(`[TEST] URL entered: "${url}"`);

    // Submit
    const addBtn = page.locator('#addCardBtn');
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click({ timeout: 5000 });
    console.log('[TEST] Add card button clicked');

    // Wait for "Adding..." state to finish
    await expect(addBtn).toHaveText('Add Card', { timeout: 15000 });
    console.log('[TEST] Card addition completed (UI state reset)');

    // Small stability wait
    await page.waitForTimeout(500);
  },

  /**
   * Get all cards on current board
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of card titles
   */
  async getCards(page) {
    console.log('[TEST] Getting all cards on board');

    const cards = await page.locator('[class*="card"]').allTextContents();
    console.log(`[TEST] Found ${cards.length} cards`);
    return cards;
  },

  /**
   * Find a card by URL
   * @param {Page} page - Playwright page object
   * @param {string} url - URL to search for
   * @returns {Promise<boolean>} True if card found
   */
  async cardExists(page, url) {
    console.log(`[TEST] Searching for card with URL: "${url}"`);

    const cardLocator = page.locator(`text="${url}"`).first();
    try {
      await cardLocator.waitFor({ state: 'visible', timeout: 3000 });
      console.log(`[TEST] Card found with URL: "${url}"`);
      return true;
    } catch (e) {
      console.log(`[TEST] Card not found with URL: "${url}"`);
      return false;
    }
  },

  /**
   * Edit card note/title
   * @param {Page} page - Playwright page object
   * @param {string} cardUrl - URL of card to edit
   * @param {string} newNote - New note text
   */
  async editCardNote(page, cardUrl, newNote) {
    console.log(`[TEST] Editing card note for URL: "${cardUrl}"`);

    // Find the card that contains this URL link, then find the edit button within it
    const card = page.locator('.card').filter({
      has: page.getByRole('link', { name: cardUrl })
    }).first();
    const editBtn = card.locator('[data-testid="card-edit-btn"]').first();

    await editBtn.waitFor({ state: 'visible', timeout: 3000 });
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ timeout: 3000 });
    console.log('[TEST] Edit button clicked');

    const titleEditable = card.locator('[data-field="title"][contenteditable="true"]').first();
    const descEditable = card.locator('[data-field="description"][contenteditable="true"]').first();
    if (!(await titleEditable.isVisible().catch(() => false))) {
      const cardId = await card.getAttribute('data-card-id');
      if (cardId) {
        await page.evaluate((id) => {
          if (window.editCard) {
            window.editCard(id);
          }
        }, cardId);
      }
    }
    await expect(titleEditable).toBeVisible({ timeout: 3000 });
    await expect(descEditable).toBeVisible({ timeout: 3000 });

    // Wait for description field to become editable (contentEditable div)
    const descDiv = card.locator('[data-field="description"]').first();
    await descDiv.waitFor({ state: 'visible', timeout: 5000 });

    // Clear and fill the description field
    await descDiv.click();
    await descDiv.fill('');
    await descDiv.type(newNote, { delay: 50 });
    console.log(`[TEST] Note updated: "${newNote}"`);

    // Submit by clicking the same button (now in save state)
    await editBtn.click({ timeout: 3000 });
    console.log('[TEST] Save button clicked');

    await page.waitForTimeout(500);
  },

  /**
   * Delete a card
   * @param {Page} page - Playwright page object
   * @param {string} cardUrl - URL of card to delete
   */
  async deleteCard(page, cardUrl) {
    console.log(`[TEST] Deleting card with URL: "${cardUrl}"`);

    // Find the card that contains this URL link, then find the delete button within it
    const card = page.locator('.card').filter({
      has: page.getByRole('link', { name: cardUrl })
    }).first();
    const deleteBtn = card.locator('[data-testid="card-delete-btn"]').first();

    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Set up dialog handler BEFORE clicking the button
    page.once('dialog', dialog => {
      console.log(`[TEST] Delete confirm dialog: "${dialog.message()}"`);
      dialog.accept();
      console.log('[TEST] Delete confirmed');
    });

    await deleteBtn.click({ timeout: 5000 });
    console.log('[TEST] Delete button clicked');

    // Wait for the card to disappear from the DOM
    await card.waitFor({ state: 'hidden', timeout: 10000 });
    console.log('[TEST] Card deleted and removed from DOM');
  },
};

export default cardUtils;
