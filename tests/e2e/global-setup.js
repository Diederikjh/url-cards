/**
 * Global setup for Playwright E2E tests
 * Prepares test environment and ensures Firebase Emulator can be accessed
 */

import * as fs from 'fs';
import * as path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function globalSetup() {
  console.log('Setting up E2E test environment...');

  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Check if Firebase Emulator is accessible
  console.log('Checking Firebase Emulator availability...');
  let emulatorReady = false;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds

  while (attempts < maxAttempts && !emulatorReady) {
    try {
      const response = await fetch('http://127.0.0.1:8080/');
      if (response.status === 404) {
        console.log('✓ Firebase Emulator is ready');
        emulatorReady = true;
        break;
      }
    } catch (e) {
      // Emulator not ready yet
    }
    attempts++;
    await delay(1000);
  }

  if (!emulatorReady) {
    console.warn('⚠️  Firebase Emulator not accessible at 127.0.0.1:8080');
    console.warn('Make sure to start it with: firebase emulators:start --only firestore,auth');
    console.log('Tests may fail if emulator is not running');
  }

  // Also check Firebase Hosting can be served
  attempts = 0;
  let hostingReady = false;
  while (attempts < 30 && !hostingReady) {
    try {
      const response = await fetch('http://127.0.0.1:5000/');
      console.log('✓ Firebase Hosting server is ready');
      hostingReady = true;
      break;
    } catch (e) {
      // Hosting not ready yet
    }
    attempts++;
    await delay(500);
  }

  if (!hostingReady) {
    console.log('⚠️  Firebase Hosting not accessible at 127.0.0.1:5000');
    console.log('It will be started automatically when tests run');
  }

  console.log('✓ Test environment setup complete');
}

export default globalSetup;
