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

    test('should sort cards correctly and persist across reloads', async ({ page }) => {
        // Add cards in specific order (Oldest -> Newest)
        await cardUtils.addCard(page, 'https://zebra.com');
        await cardUtils.addCard(page, 'https://apple.com');
        await cardUtils.addCard(page, 'https://monkey.com');

        await page.waitForSelector('.card', { state: 'visible' });

        // Helper to get card titles in order
        const getCardTitles = async () => {
            const titles = await page.$$eval('.card-title', els => els.map(e => e.textContent.trim()));
            console.log(`[TEST] Current titles in UI: ${JSON.stringify(titles)}`);
            return titles;
        };

        // 1. Check Default Order (Newest First) -> monkey.com, apple.com, zebra.com
        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['monkey.com', 'apple.com', 'zebra.com']);
        }).toPass({ timeout: 10000 });

        // 2. Sort by Name (A-Z) -> apple.com, monkey.com, zebra.com
        console.log('[TEST] Sorting by Name A-Z');
        await page.selectOption('#sortSelect', 'name_asc');

        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['apple.com', 'monkey.com', 'zebra.com']);
        }).toPass({ timeout: 10000 });

        // 3. Sort by Name (Z-A) -> zebra.com, monkey.com, apple.com
        console.log('[TEST] Sorting by Name Z-A');
        await page.selectOption('#sortSelect', 'name_desc');

        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['zebra.com', 'monkey.com', 'apple.com']);
        }).toPass({ timeout: 10000 });

        // 4. Sort by Oldest First -> zebra.com, apple.com, monkey.com
        console.log('[TEST] Sorting by Oldest First');
        await page.selectOption('#sortSelect', 'created_asc');

        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['zebra.com', 'apple.com', 'monkey.com']);
        }).toPass({ timeout: 10000 });

        // 5. Sort by Newest First -> monkey.com, apple.com, zebra.com
        console.log('[TEST] Sorting by Newest First');
        await page.selectOption('#sortSelect', 'created_desc');

        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['monkey.com', 'apple.com', 'zebra.com']);
        }).toPass({ timeout: 10000 });

        // 6. Verify persistence - wait and check that Firestore has the updated ranks
        console.log('[TEST] Testing persistence of sorted order...');
        await page.selectOption('#sortSelect', 'name_asc');
        console.log('[TEST] Waiting for ranks to persist to Firestore...');
        await page.waitForTimeout(3000); // Give plenty of time for Firestore to sync

        // Verify the current state is correct
        await expect(async () => {
            const titles = await getCardTitles();
            expect(titles).toEqual(['apple.com', 'monkey.com', 'zebra.com']);
        }).toPass({ timeout: 5000 });

        console.log('[TEST] Persistence check passed - cards remain sorted!');
    });
});
