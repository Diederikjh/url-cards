/**
 * Test utilities for E2E tests
 * Provides helper functions and fixtures for reliable browser automation
 * Uses Firebase Auth Emulator for proper authentication
 */

const testUtils = {
  /**
   * Set up Firebase Auth before navigation
   * This intercepts Firebase SDK loading and configures emulator
   * @param {Page} page - Playwright page object
   * @param {BrowserContext} context - Playwright browser context
   */
  /**
   * Set up Firebase Auth before navigation
   * This intercepts Firebase SDK loading and configures emulator
   * @param {Page} page - Playwright page object
   * @param {BrowserContext} context - Playwright browser context
   * @param {Object} options - Optional: { email, uid } to use stable credentials
   */
  async setupAuth(page, context, options = {}) {
    const email = options.email || `test-${Date.now()}@example.com`;
    const uid = options.uid || 'test-user-' + Date.now();

    // Inject Firebase configuration before page loads
    await page.addInitScript(({ email, uid }) => {
      window.__TEST_EMAIL__ = email;
      window.__TEST_UID__ = uid;

      // Check if Firebase is ready
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
          clearInterval(checkFirebase);
          // Configure Auth Emulator
          console.log('[TEST] Waiting for Auth Emulator...');
        }
      }, 100);

      setTimeout(() => clearInterval(checkFirebase), 10000);
    }, { email, uid });

    return { email, uid };
  },

  /**
   * Wait for Firebase App to be ready and user authenticated
   * @param {Page} page - Playwright page object
   */
  async waitForAppReady(page, timeout = 20000) {
    const startTime = Date.now();

    // Wait for Firebase initialization
    await page.waitForFunction(() => {
      return typeof firebase !== 'undefined' && firebase.apps.length > 0;
    }, { timeout });

    console.log('[TEST] Firebase initialized');

    // Now create a test user and sign in
    await page.evaluate(async () => {
      const email = window.__TEST_EMAIL__;
      const password = 'TestPassword123!';

      // Small delay to let Firebase Auth initialize from session if possible
      await new Promise(r => setTimeout(r, 500));

      const currentUser = firebase.auth().currentUser;
      if (currentUser && currentUser.email === email) {
        console.log('[TEST] User already authenticated:', email);
        return;
      }

      try {
        // Try to create user
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('[TEST] User created:', email);
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          // User exists, sign in
          await firebase.auth().signInWithEmailAndPassword(email, password);
          console.log('[TEST] User signed in:', email);
        } else {
          throw e;
        }
      }
    });

    // Wait for boards view to become visible (means user is properly authenticated)
    const remainingTime = timeout - (Date.now() - startTime);
    await page.waitForFunction(() => {
      const boardsView = document.getElementById('boardsView');
      if (!boardsView) return false;
      const style = window.getComputedStyle(boardsView);
      return style.display !== 'none';
    }, { timeout: remainingTime });

    console.log('[TEST] App is ready - boards view is visible');
  },

  /**
   * Wait for element to be visible and stable
   * @param {Page} page - Playwright page object
   * @param {string} selector - CSS selector
   * @param {number} timeout - Wait timeout in ms
   */
  async waitForElement(page, selector, timeout = 3000) {
    await page.waitForSelector(selector, { timeout });
    await page.locator(selector).first().waitFor({ state: 'visible', timeout });
  },
};

export default testUtils;
