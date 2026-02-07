# Testing

## Running Tests

Unit tests do not require Firebase emulators, but emulator-backed tests do.

```bash
# Run unit tests
npm test

# Or with coverage
npm run test:coverage
```

## What's Tested

- **Unit rules** (Jest): sorting, tag validation, tag suggestions, tag usage, and tag filtering logic from `public/js/rules/*`.
- **UI/E2E** (Playwright): core board/card flows and multi-step interactions (see `E2E_TESTING.md`).

## Test Locations

Unit tests live under `tests/`, and E2E tests live under `tests/e2e/`. Refer to those paths in the repo for the most current coverage details.

## Important: Code Changes Require Test Review

Since these tests focus on shared logic and critical user workflows, **whenever code changes are made, LLMs must review the test files to ensure they still cover the expected behavior and no fixes are needed.**

## Choosing the Right Test Type (Balance Guidance)

- **Prefer unit tests** for deterministic logic and edge cases:
  - Tag normalization/validation rules.
  - Sorting and ranking logic.
  - Tag suggestion/filter/usage calculations.
- **Use UI/E2E tests** sparingly for:
  - User-critical flows across the DOM, Firebase, and routing layers.
  - Integration points where failures would be obvious to users.

**Goal:** keep most coverage in unit tests for speed and clarity, and keep UI/E2E tests focused on a small set of end-to-end scenarios to avoid flakiness and long CI runs.

## Notes

- Jest tests run serially (`maxWorkers: 1`) to avoid shared resource conflicts.
- Uses `--forceExit` due to Firebase Admin SDK keeping GRPC connections alive.
- If emulator-backed tests are added, the database is cleared between each test for isolation.

## CI/CD

Tests run automatically on every push and pull request before deployment.
