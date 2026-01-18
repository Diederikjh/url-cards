/**
 * Global teardown for Playwright E2E tests
 * Cleans up after tests complete
 */

async function globalTeardown() {
  console.log('\nCleaning up E2E test environment...');
  // Could add cleanup here like killing emulator if needed
  // But typically you want to keep emulator running if tests are re-run
  console.log('✓ Cleanup complete');
}

export default globalTeardown;
