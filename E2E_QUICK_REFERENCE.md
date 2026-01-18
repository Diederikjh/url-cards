# Quick Reference: E2E Testing Commands

## ⚡ Quick Start (All-in-One)

The easiest way to run tests with all services:

```bash
./run-e2e-tests.sh
```

This script automatically:
1. Starts Firebase Emulator
2. Starts Firebase Hosting server
3. Runs all E2E tests
4. Cleans up when done

## Manual Setup (3 Terminals)

If you prefer to run services separately:

### Terminal 1: Firebase Emulator
```bash
firebase emulators:start --only firestore,auth
```

### Terminal 2: Firebase Hosting Server
```bash
npm run serve:test
```

### Terminal 3: Run Tests
```bash
npm run test:e2e              # Run all E2E tests (headless)
npm run test:e2e:headed       # Run tests with visible browser
npm run test:e2e:debug        # Interactive debug mode with Inspector
```

## Running Tests

| Command | Purpose |
|---------|---------|
| `npm run test:e2e` | Run all E2E tests (headless, both browsers) |
| `npm run test:e2e:headed` | Run tests with visible browser window |
| `npm run test:e2e:debug` | Interactive debug mode with Inspector |
| `npx playwright test --list` | List all tests |
| `npx playwright test -g "board"` | Run tests matching pattern |
| `./run-e2e-tests.sh` | Run with all services (all-in-one) |

## Viewing Results

| Command | Purpose |
|---------|---------|
| `npx playwright show-report` | Open HTML test report |
| `ls test-results/output/` | View screenshots/videos from failed tests |

## Key Files

| File | Purpose |
|------|---------|
| `playwright.config.js` | Main config (single worker, timeouts, reporters) |
| `tests/e2e/boards.e2e.js` | 9 test cases for board/card operations |
| `tests/e2e/test-utils.js` | Helper functions for reliable operations |
| `tests/e2e/README.md` | Complete testing documentation |
| `tests/e2e/global-setup.js` | Environment checks and setup |
| `.github/workflows/e2e-tests.yml` | CI/CD automation |
| `run-e2e-tests.sh` | Helper script to run all services + tests |

## Available Test Helpers

```javascript
import { testUtils } from './test-utils.js';

// Authentication
await testUtils.mockAuth(page, 'user-id', 'email@example.com');

// Waiting
await testUtils.waitForElement(page, '#selector');

// Boards
await testUtils.createBoard(page, 'Board Name');
await testUtils.renameBoard(page, 'Old Name', 'New Name');
await testUtils.deleteBoard(page, 'Board Name');

// Cards
await testUtils.addCard(page, 'https://example.com');
await testUtils.editCardTitle(page, 'Old Title', 'New Title');
await testUtils.deleteCard(page, 'Card Title');
```

## Why These Tests Won't Be Flaky

✅ **Single worker** - Tests run sequentially, no race conditions
✅ **Explicit waits** - Elements checked before interaction
✅ **Auto-retry** - Playwright retries failed assertions
✅ **Unique data** - Timestamps prevent conflicts
✅ **Headless safe** - Works perfectly without UI
✅ **Emulator tested** - Uses Firebase Emulator for isolation
✅ **Network idle** - Waits for data to load

## CI/CD

Tests run automatically:
- ✅ On push to `main` or `develop`
- ✅ On all pull requests
- ✅ Results in workflow artifacts
- ✅ Comments on PR with status

## Troubleshooting

### Tests won't start - "Can't connect to localhost:8080 or 5000"

Make sure you have:
1. **Terminal 1 running**: `firebase emulators:start --only firestore,auth`
2. **Terminal 2 running**: `npm run serve:test`
3. **Terminal 3**: `npm run test:e2e`

Or just use: `./run-e2e-tests.sh`

### Port 5000 in use
```bash
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Firebase Emulator stuck
```bash
lsof -ti:8080,9099 | xargs kill -9
```

### Tests timeout
- Check both Firebase services are running
- Increase timeouts in `playwright.config.js` if needed
- Run `npm run test:e2e:debug` to see what's hanging

### Can't find element
```bash
# Use debug mode to pause and inspect
npm run test:e2e:debug
# Then use browser DevTools to check selectors
```

### All services already running
The script will detect this and reuse existing services

---

**Start here:** `./run-e2e-tests.sh` (easiest) or `npm run test:e2e` (if services already running)

