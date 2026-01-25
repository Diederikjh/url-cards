/**
 * E2E tests for tag operations on cards
 *
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';
import boardUtils from './board-utils.js';
import cardUtils from './card-utils.js';

test.describe('URL Cards Tag E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    await testUtils.setupAuth(page, context);
    await page.goto('/', { waitUntil: 'networkidle' });
    await testUtils.waitForAppReady(page);
  });

  async function setupCardWithEdit(page) {
    const boardName = `Tags Board ${Date.now()}`;
    const cardUrl = 'https://example.com';

    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, cardUrl, boardName);

    const card = page.locator('.card').filter({
      has: page.getByRole('link', { name: cardUrl })
    }).first();

    await ensureEditMode(card);

    const getTagInput = async () => {
      await ensureEditMode(card);
      const input = card.locator('.tag-input').first();
      await input.waitFor({ state: 'visible', timeout: 3000 });
      return input;
    };

    return { card, getTagInput };
  }

  async function ensureEditMode(card) {
    const editBtn = card.locator('[data-testid="card-edit-btn"]').first();
    const titleEditable = card.locator('[data-field="title"][contenteditable="true"]').first();
    const descEditable = card.locator('[data-field="description"][contenteditable="true"]').first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await editBtn.waitFor({ state: 'visible', timeout: 3000 });
      await editBtn.scrollIntoViewIfNeeded();

      const hasSaveClass = await editBtn.evaluate((el) => el.classList.contains('save-btn')).catch(() => false);
      if (!hasSaveClass) {
        await editBtn.click({ force: true });
      }

      if (await titleEditable.isVisible().catch(() => false)) {
        return;
      }

      const cardId = await card.getAttribute('data-card-id');
      if (cardId) {
        await card.page().evaluate((id) => {
          if (window.editCard) {
            window.editCard(id);
          }
        }, cardId);
      }

      if (await titleEditable.isVisible().catch(() => false)) {
        return;
      }
    }

    await expect(titleEditable).toBeVisible({ timeout: 3000 });
    await expect(descEditable).toBeVisible({ timeout: 3000 });
  }

  test('should create a new tag from input', async ({ page }) => {
    const { card, getTagInput } = await setupCardWithEdit(page);

    const tagInput = await getTagInput();
    await tagInput.fill('bread');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();
  });

  test('should add existing tag via suggestion on Enter', async ({ page }) => {
    const { card, getTagInput } = await setupCardWithEdit(page);

    let tagInput = await getTagInput();
    await tagInput.fill('bread');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();

    tagInput = await getTagInput();
    await tagInput.fill('bre');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toHaveCount(1);
  });

  test('should allow substring tag creation after dismissing suggestions', async ({ page }) => {
    const { card, getTagInput } = await setupCardWithEdit(page);

    let tagInput = await getTagInput();
    await tagInput.fill('bread');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();

    await ensureEditMode(card);
    const breadChip = card.locator('.tag-chip', { hasText: 'bread' });
    await breadChip.locator('.tag-remove-btn').waitFor({ state: 'visible', timeout: 3000 });
    await breadChip.locator('.tag-remove-btn').click();
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toHaveCount(0);

    tagInput = await getTagInput();
    await tagInput.fill('br');
    const dismissBtn = card.locator('.tag-suggestion-dismiss').first();
    await dismissBtn.waitFor({ state: 'visible', timeout: 5000 });
    await dismissBtn.click();
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'br' })).toBeVisible();
  });

  test('should remove a tag from a card in edit mode', async ({ page }) => {
    const { card, getTagInput } = await setupCardWithEdit(page);

    const tagInput = await getTagInput();
    await tagInput.fill('bread');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();

    await ensureEditMode(card);
    const breadChip = card.locator('.tag-chip', { hasText: 'bread' });
    await breadChip.locator('.tag-remove-btn').waitFor({ state: 'visible', timeout: 3000 });
    await breadChip.locator('.tag-remove-btn').click();
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toHaveCount(0);
  });

  test('should keep tags after saving card', async ({ page }) => {
    const { card, getTagInput } = await setupCardWithEdit(page);

    const tagInput = await getTagInput();
    await tagInput.fill('bread');
    await tagInput.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();

    await ensureEditMode(card);
    const saveBtn = card.locator('[data-testid="card-edit-btn"]').first();
    await saveBtn.click({ timeout: 5000 });

    await expect(card.locator('.tag-chip', { hasText: 'bread' })).toBeVisible();
  });
});
