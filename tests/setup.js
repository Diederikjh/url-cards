// Test setup for Firebase emulator tests
const admin = require('firebase-admin');
const http = require('http');

const PROJECT_ID = 'test-project';

// Configure environment to use emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin SDK
let initialized = false;

function getFirestore() {
  if (!initialized) {
    admin.initializeApp({ projectId: PROJECT_ID });
    initialized = true;
  }
  return admin.firestore();
}

async function clearDatabase() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'DELETE',
      hostname: 'localhost',
      port: 8080,
      path: `/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Add small delay to ensure cleanup completes
          setTimeout(resolve, 100);
        } else {
          reject(new Error(`Failed to clear database: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      // In CI/CD environments, the emulator might not be fully ready
      // Log but don't reject to prevent test failures from cleanup errors
      console.warn('Warning: Failed to clear database:', error.message);
      resolve();
    });
    req.end();
  });
}

async function cleanup() {
  try {
    const apps = admin.apps;
    if (apps && apps.length > 0) {
      await Promise.all(apps.map(app => app.delete()).filter(Boolean));
    }
  } catch (error) {
    console.warn('Warning: Error during cleanup:', error.message);
    // Don't throw - we want tests to complete even if cleanup fails
  }
}

module.exports = {
  getFirestore,
  clearDatabase,
  cleanup,
  PROJECT_ID,
  admin
};
