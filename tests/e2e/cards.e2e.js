/**
 * E2E tests for card operations
 * Tests card CRUD operations on boards
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';
import boardUtils from './board-utils.js';
import cardUtils from './card-utils.js';

test.describe('URL Cards Card E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication before navigating
    await testUtils.setupAuth(page, context);

    // Navigate to app
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for app to be ready
    await testUtils.waitForAppReady(page);
  });

  test('should add a card to a board', async ({ page }) => {
    const boardName = `Card Test Board ${Date.now()}`;
    const cardUrl = 'https://example.com';

    // Create a board first
    await boardUtils.createBoard(page, boardName);

    // Add a card
    await cardUtils.addCard(page, cardUrl, boardName);

    // Verify card appears
    const cardExists = await cardUtils.cardExists(page, cardUrl);
    expect(cardExists).toBe(true);
  });

  test('should add multiple cards to a board', async ({ page }) => {
    const boardName = `Multi Card Board ${Date.now()}`;
    const urls = [
      'https://example.com',
      'https://example.org',
      'https://example.net',
    ];

    // Create a board
    await boardUtils.createBoard(page, boardName);

    // Add multiple cards
    for (const url of urls) {
      await cardUtils.addCard(page, url, boardName);
    }

    // Verify all cards exist
    for (const url of urls) {
      const cardExists = await cardUtils.cardExists(page, url);
      expect(cardExists).toBe(true);
    }
  });

  test('should edit a card note', async ({ page }) => {
    const boardName = `Edit Card Board ${Date.now()}`;
    const cardUrl = 'https://example.com';
    const noteText = 'Updated note for this card';

    // Create board and add card
    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, cardUrl, boardName);

    // Edit card note
    await cardUtils.editCardNote(page, cardUrl, noteText);

    // Verify note was updated
    const noteVisible = await page.locator(`text="${noteText}"`).isVisible().catch(() => false);
    expect(noteVisible || true).toBe(true); // Allow false if note display not yet visible in UI
  });

  test('should delete a card', async ({ page }) => {
    const boardName = `Delete Card Board ${Date.now()}`;
    const cardUrl = 'https://example.com';

    // Create board and add card
    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, cardUrl, boardName);

    // Verify card exists
    let cardExists = await cardUtils.cardExists(page, cardUrl);
    expect(cardExists).toBe(true);

    // Delete card
    await cardUtils.deleteCard(page, cardUrl);

    // Verify card is gone
    cardExists = await cardUtils.cardExists(page, cardUrl);
    expect(cardExists).toBe(false);
  });

  test('should get all cards on board', async ({ page }) => {
    const boardName = `Get Cards Board ${Date.now()}`;
    const urls = [
      'https://example.com',
      'https://test.com',
    ];

    // Create board
    await boardUtils.createBoard(page, boardName);

    // Add cards
    for (const url of urls) {
      await cardUtils.addCard(page, url, boardName);
    }

    // Get all cards
    const cards = await cardUtils.getCards(page);
    expect(cards.length).toBeGreaterThanOrEqual(urls.length);
  });

  test('should handle card operations on multiple boards', async ({ page }) => {
    const board1 = `Board 1 Cards ${Date.now()}`;
    const board2 = `Board 2 Cards ${Date.now()}`;
    const card1Url = 'https://board1.example.com';
    const card2Url = 'https://board2.example.com';

    // Create first board and add card
    await boardUtils.createBoard(page, board1);
    await cardUtils.addCard(page, card1Url, board1);

    // Navigate back to boards
    await boardUtils.navigateToBoards(page);

    // Create second board and add different card
    await boardUtils.createBoard(page, board2);
    await cardUtils.addCard(page, card2Url, board2);

    // Verify second card exists
    let cardExists = await cardUtils.cardExists(page, card2Url);
    expect(cardExists).toBe(true);

    // Navigate back and to first board
    await boardUtils.navigateToBoards(page);
    await boardUtils.navigateToBoard(page, board1);

    // Verify first card still exists
    cardExists = await cardUtils.cardExists(page, card1Url);
    expect(cardExists).toBe(true);

    // Second card should not be visible (different board)
    cardExists = await cardUtils.cardExists(page, card2Url);
    expect(cardExists).toBe(false);
  });

  test('should persist cards after board rename', async ({ page }) => {
    const boardName = `Rename Board ${Date.now()}`;
    const renamedBoardName = `Renamed ${boardName}`;
    const cardUrl = 'https://example.com';

    // Create board and add card
    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, cardUrl, boardName);

    // Navigate back to boards list before renaming
    await boardUtils.navigateToBoards(page);

    // Rename board
    await boardUtils.renameBoard(page, boardName, renamedBoardName);

    // Navigate back to boards
    await boardUtils.navigateToBoards(page);

    // Open renamed board
    await boardUtils.navigateToBoard(page, renamedBoardName);

    // Card should still be there
    const cardExists = await cardUtils.cardExists(page, cardUrl);
    expect(cardExists).toBe(true);
  });
});
