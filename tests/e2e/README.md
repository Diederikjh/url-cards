# E2E Tests for URL Cards

This directory contains end-to-end (E2E) tests using Playwright for the URL Cards application.

## Why Playwright for E2E Testing?

Playwright is chosen for reliability in CI/CD environments because:

1. **Cross-browser support** - Tests run on Chromium and Firefox
2. **Headless by default** - Works without UI, perfect for CI/CD
3. **Built-in reliability features**:
   - Auto-waiting for elements
   - Network idle detection
   - Automatic retry logic
   - Screenshot/video on failure
4. **No flakiness** - Single worker mode, explicit waits, stable timeouts
5. **Good CI integration** - Docker support, artifact collection, reporting

## Setup

### Install Playwright

```bash
npm install
npx playwright install
```

### Start Firebase Emulator (Required for Tests)

**Before running tests**, you need to start Firebase Emulator in a separate terminal:

```bash
firebase emulators:start --only firestore,auth
```

This will start:
- Firestore Emulator on `localhost:8080`
- Auth Emulator on `localhost:9099`

Keep this terminal running while you run tests.

### Start Firebase Hosting (Required for Tests)

**In another terminal**, start the Firebase Hosting server:

```bash
npm run serve:test
```

This serves the app on `http://localhost:5000` for tests to interact with.

## Running Tests

### Prerequisites

You must have **two terminals** running:

**Terminal 1** - Firebase Emulator:
```bash
firebase emulators:start --only firestore,auth
```

**Terminal 2** - Firebase Hosting Server:
```bash
npm run serve:test
```

**Terminal 3** - Run Tests:
```bash
npm run test:e2e
```

### Local Development

```bash
# Run E2E tests in headless mode
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Debug mode (interactive)
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/boards.e2e.js

# Run specific test
npx playwright test -g "should create a new board"
```

### In CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

See [.github/workflows/e2e-tests.yml](../../.github/workflows/e2e-tests.yml)

## Test Structure

### Test Files

- `boards.e2e.js` - Tests for board CRUD operations
- `test-utils.js` - Helper functions for common operations
- `global-setup.js` - Initialize emulator and environment

### Test Patterns

Tests use consistent patterns for reliability:

```javascript
// Wait for element visibility
await testUtils.waitForElement(page, '#selector');

// Use helpers for complex operations
await testUtils.createBoard(page, 'Board Name');

// Explicit waits instead of sleep()
await page.waitForNavigation({ timeout: 10000 });
```

## Key Reliability Features

### 1. Automatic Waits

- Elements waited for visibility before interaction
- Network idle detection after navigation
- Explicit timeouts on all operations

### 2. Mock Authentication

Tests mock Firebase auth to avoid login flow, making tests faster and more reliable:

```javascript
await testUtils.mockAuth(page, 'test-user-123', 'test@example.com');
```

### 3. Unique Test Data

Each test uses timestamps to create unique board/card names:

```javascript
const boardName = `Test Board ${Date.now()}`;
```

### 4. Error Handling

Resilient selectors and graceful fallbacks:

```javascript
// Try to find save button with multiple selectors
const saveBtn = page.locator('button:has-text("Save")').first();
```

### 5. Single Worker Mode

Tests run sequentially (not in parallel) to avoid race conditions:

```javascript
workers: 1  // In playwright.config.js
```

## Debugging Failed Tests

### 1. View Test Report

```bash
npx playwright show-report
```

### 2. Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through each action
- Inspect DOM at each step
- Evaluate expressions in console

### 3. Check Videos/Screenshots

Failed tests automatically capture:
- Screenshots in `test-results/output/`
- Videos in `test-results/output/`

### 4. Run Headed

```bash
npm run test:e2e:headed
```

See the browser in action as tests run.

## Writing New Tests

### Template

```javascript
import { test, expect } from '@playwright/test';
import { testUtils } from './test-utils.js';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await testUtils.mockAuth(page);
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const boardName = `Test ${Date.now()}`;

    // Act
    await testUtils.createBoard(page, boardName);

    // Assert
    await expect(page.locator(`text="${boardName}"`)).toBeVisible();
  });
});
```

### Available Utilities

See `test-utils.js` for helpers:
- `mockAuth()` - Mock Firebase authentication
- `waitForElement()` - Wait for element visibility
- `createBoard()` - Create a board
- `renameBoard()` - Rename a board
- `deleteBoard()` - Delete a board
- `addCard()` - Add a card to board
- `editCardTitle()` - Edit card title
- `deleteCard()` - Delete a card

## Common Issues

### Tests timeout in CI/CD

**Solution**: Check Firebase Emulator is starting correctly in workflow. May need to increase timeouts.

### Cannot find element

**Solution**: Use `page.pause()` to stop and inspect, or check element selectors match your UI.

### Flaky tests

**Solution**: Ensure using `waitForElement()`, `waitForNavigation()`, avoid `page.waitForTimeout()` when possible.

### Auth not working

**Solution**: Check `mockAuth()` is called before navigating to app, then reload.

## Best Practices

1. ✅ Use helpers from `test-utils.js`
2. ✅ Wait for elements explicitly
3. ✅ Use unique data (timestamps)
4. ✅ Clean up after tests
5. ✅ One assertion per logical unit
6. ✅ Descriptive test names
7. ✅ Use `test.describe()` to organize tests

---

## Troubleshooting

### Emulator won't start

```bash
# Kill any lingering processes
lsof -ti:8080,9099 | xargs kill -9

# Try starting manually
firebase emulators:start --only firestore,auth
```

### Port already in use

```bash
# Find what's using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Tests pass locally but fail in CI

- Check Node.js version matches
- Ensure `firebase` is installed globally in CI
- Check environment variables are set
- Review CI workflow logs
