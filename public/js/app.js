// Main application orchestrator
import { initializeFirebase, db, cardsCollection } from './firebase-init.js';
import { initAuthUI, setupAuthStateListener } from './auth.js';
import { initRouter, handleRouting, showLoginView } from './router.js';
import { initBoardsUI, ensureDefaultBoard, loadBoard } from './boardsUI.js';
import { initCardsUI, loadCards } from './cardsUI.js';
import { FirestoreBoardService } from './services/FirestoreBoardService.js';
import { FirestoreCardService } from './services/FirestoreCardService.js';

// Service instances
let boardService;
let cardService;

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

        // Create service instances
        boardService = new FirestoreBoardService(db, cardsCollection);
        cardService = new FirestoreCardService(db);

        // Initialize UI modules with injected services
        initAuthUI();
        initBoardsUI(boardService);
        initCardsUI(cardService);
        initRouter(onBoardLoad, boardService, cardService);

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
        // Still call handleRouting to check for public routes
        handleRouting();
    }
}

function onBoardLoad(boardId) {
    loadBoard(boardId);
    loadCards(boardId);
}
