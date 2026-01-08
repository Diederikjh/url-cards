// Main application orchestrator
import { initializeFirebase } from './firebase-init.js';
import { initAuthUI, setupAuthStateListener } from './auth.js';
import { initRouter, handleRouting, showLoginView } from './router.js';
import { initBoardsUI, ensureDefaultBoard, loadBoard } from './boards.js';
import { initCardsUI, loadCards } from './cards.js';

document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    document.addEventListener('firebaseLoaded', initializeApp);

    // Fallback: try to initialize after a short delay
    setTimeout(initializeApp, 1000);
});

function initializeApp() {
    try {
        // Initialize Firebase
        if (!initializeFirebase()) {
            return;
        }

        // Initialize UI modules
        initAuthUI();
        initBoardsUI();
        initCardsUI();
        initRouter(onBoardLoad);

        // Set up authentication state listener
        setupAuthStateListener(onAuthChanged);
    } catch (error) {
        console.error('Application initialization error:', error);
    }
}

function onAuthChanged(user) {
    if (user) {
        ensureDefaultBoard().then(() => {
            handleRouting();
        });
    } else {
        showLoginView();
    }
}

function onBoardLoad(boardId) {
    loadBoard(boardId);
    loadCards(boardId);
}
