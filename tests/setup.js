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
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Failed to clear database: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function cleanup() {
  const apps = admin.apps;
  await Promise.all(apps.map(app => app.delete()));
}

module.exports = {
  getFirestore,
  clearDatabase,
  cleanup,
  PROJECT_ID,
  admin
};
