/**
 * Simple diagnostic test to verify app loads and authenticates properly
 * Run with: npx playwright test tests/e2e/diagnostic.e2e.js
 */

import { test, expect } from '@playwright/test';
import testUtils from './test-utils.js';

test('diagnostic: app loads and authenticates', async ({ page, context }) => {
  console.log('Starting diagnostic test...');

  // Setup auth
  console.log('Step 1: Setting up auth...');
  await testUtils.setupAuth(page, context);

  // Navigate
  console.log('Step 2: Navigating to app...');
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for app ready
  console.log('Step 3: Waiting for app to be ready...');
  await testUtils.waitForAppReady(page);

  // Verify boards view is visible
  console.log('Step 4: Verifying boards view...');
  const boardsView = page.locator('#boardsView');
  await expect(boardsView).toBeVisible();

  // Verify create board button exists
  console.log('Step 5: Checking create board button...');
  const createBtn = page.locator('#createBoardBtn');
  await expect(createBtn).toBeVisible();

  console.log('✓ Diagnostic test passed!');
});
