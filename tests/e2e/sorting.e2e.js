import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';
import cardUtils from './card-utils.js';

test.describe('Card Sorting', () => {
    let testCredentials;

    test.beforeEach(async ({ page, context }) => {
        // Setup auth once per test with stable credentials if we want to test reloads
        // However, beforeEach runs for every test. If we have multiple tests, we might want unique users.
        // For the persistence reload test, we need the SAME credentials before and after reload.
        if (!testCredentials) {
            testCredentials = {
                email: `test-sorting-${Date.now()}@example.com`,
                uid: `uid-sorting-${Date.now()}`
            };
        }

        await testUtils.setupAuth(page, context, testCredentials);
        await page.goto('/', { waitUntil: 'networkidle' });
        await testUtils.waitForAppReady(page);

        // Ensure we have a board. 
        const isBoardViewVisible = await page.evaluate(() => {
            const boardView = document.getElementById('boardView');
            return boardView && window.getComputedStyle(boardView).display !== 'none';
        });

        if (!isBoardViewVisible) {
            await page.waitForSelector('.board-item', { state: 'visible', timeout: 10000 });
            await page.click('.board-item');
            await page.waitForFunction(() => {
                const boardView = document.getElementById('boardView');
                return boardView && window.getComputedStyle(boardView).display !== 'none';
            });
        }
    });

    test('should allow selecting a sort option', async ({ page }) => {
        await cardUtils.addCard(page, 'https://zebra.com');
        await cardUtils.addCard(page, 'https://apple.com');

        await page.waitForSelector('.card', { state: 'visible' });

        await page.selectOption('#sortSelect', 'name_asc');
        await expect(page.locator('#sortSelect')).toHaveValue('name_asc');

        await page.selectOption('#sortSelect', 'created_desc');
        await expect(page.locator('#sortSelect')).toHaveValue('created_desc');
    });
});
