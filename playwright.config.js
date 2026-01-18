import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Optimized for CI/CD reliability with headless browser automation
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.js',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Expect timeout (for waitFor assertions)
  expect: {
    timeout: 10 * 1000,
  },

  // Run tests in parallel (disable for more stable CI)
  fullyParallel: false,
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  outputDir: 'test-results/output',

  use: {
    // Base URL for all requests
    baseURL: 'http://localhost:5000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Headless mode for CI/CD
    headless: true,
  },

  // Do NOT use webServer - we'll handle Firebase Emulator separately
  // webServer will block and prevent Playwright from running

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], headless: true },
    },
  ],

  // Global setup/teardown
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
});
