# Testing

## Running Tests

Tests require Firebase emulators to be running:

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Run tests
npm test

# Or with coverage
npm run test:coverage
```

## What's Tested

- **Boards**: Create, read, update, delete operations
- **Cards**: Create, read, update, delete operations
- **Data relationships**: Board-card associations and cascading deletes

## Test Files

- `tests/setup.js` - Firebase emulator configuration
- `tests/boards.test.js` - Board CRUD operations (12 tests)
- `tests/cards.test.js` - Card CRUD operations (15 tests)

## Notes

- Tests run serially (`maxWorkers: 1`) to avoid database conflicts
- Uses `--forceExit` due to Firebase Admin SDK keeping GRPC connections alive
- Database is cleared between each test for isolation

## CI/CD

Tests run automatically on every push and pull request before deployment.
