/**
 * E2E tests for tags UI (filters and counts)
 *
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';
import boardUtils from './board-utils.js';
import cardUtils from './card-utils.js';

test.describe('URL Cards Tags UI E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    await testUtils.setupAuth(page, context);
    await page.goto('/', { waitUntil: 'networkidle' });
    await testUtils.waitForAppReady(page);
  });

  function getCardByUrl(page, url) {
    return page.locator('.card').filter({
      has: page.locator(`a[href="${url}"]`)
    }).first();
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

  async function addTagAndSave(card, tagName) {
    await ensureEditMode(card);
    const input = card.locator('.tag-input').first();
    await input.waitFor({ state: 'visible', timeout: 3000 });
    await input.fill(tagName);
    await input.press('Enter');
    await expect(card.locator('.tag-chip', { hasText: tagName })).toBeVisible();
    const saveBtn = card.locator('[data-testid="card-edit-btn"]').first();
    await saveBtn.click({ timeout: 5000 });
  }

  test('should select a tag filter and clear it', async ({ page }) => {
    const boardName = `Filter Board ${Date.now()}`;
    const workUrl = 'https://work.example.com';
    const personalUrl = 'https://personal.example.com';

    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, workUrl, boardName);
    await cardUtils.addCard(page, personalUrl, boardName);

    const workCard = getCardByUrl(page, workUrl);
    const personalCard = getCardByUrl(page, personalUrl);

    await addTagAndSave(workCard, 'work');
    await addTagAndSave(personalCard, 'personal');

    await page.click('#tagFilterToggleBtn');
    const workFilter = page.locator('.tag-filter-option', { hasText: 'work' }).first();
    await workFilter.waitFor({ state: 'visible', timeout: 5000 });
    await workFilter.click();

    await expect(page.locator('#tagFilterToggleBtn')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#tagFilterActiveLabel')).toHaveText('work');

    await page.click('#tagFilterToggleBtn');
    await page.click('#clearTagFilterBtn');

    await expect(page.locator('#tagFilterToggleBtn')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#tagFilterPanel')).not.toHaveClass(/has-active-filter/);
  });

  test('should render tag counts in manage tags view', async ({ page }) => {
    const boardName = `Tag Counts ${Date.now()}`;
    const firstUrl = 'https://alpha.example.com';

    await boardUtils.createBoard(page, boardName);
    await cardUtils.addCard(page, firstUrl, boardName);

    const firstCard = getCardByUrl(page, firstUrl);

    await addTagAndSave(firstCard, 'alpha');

    await page.click('#userMenuBtn');
    await page.click('#manageTagsBtn');

    await page.waitForFunction(() => {
      const view = document.getElementById('tagsView');
      return view && window.getComputedStyle(view).display !== 'none';
    }, { timeout: 5000 });

    const alphaRow = page.locator('.tag-row').filter({
      has: page.locator('.tag-preview', { hasText: 'alpha' })
    }).first();

    await expect(alphaRow.locator('.tag-count')).toBeVisible();
    await expect(alphaRow.locator('.tag-count')).toContainText('card');
  });
});
