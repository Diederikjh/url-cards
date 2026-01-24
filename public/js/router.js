// Routing module
import { getCurrentUser } from './auth.js';
import { loadBoards } from './boardsUI.js';
import { showTagsView } from './tagsUI.js';
import { initPublicUI, loadPublicBoard, unsubscribePublicCards } from './public-view.js';

let boardsView;
let boardView;
let publicView;
let tagsView;
let onBoardLoadCallback;

/**
 * Initialize router
 * @param {Function} onBoardLoad - Callback when board is loaded
 * @param {BoardService} boardService - Board service instance
 * @param {CardService} cardService - Card service instance
 */
export function initRouter(onBoardLoad, boardService, cardService) {
    boardsView = document.getElementById('boardsView');
    boardView = document.getElementById('boardView');
    publicView = document.getElementById('publicView');
    tagsView = document.getElementById('tagsView');
    onBoardLoadCallback = onBoardLoad;

    initPublicUI(boardService, cardService);

    window.addEventListener('hashchange', handleRouting);
}

export function handleRouting() {
    const hash = window.location.hash;
    console.log('handleRouting called with hash:', hash);

    // Check if it's a public route
    if (hash.startsWith('#public/')) {
        const shareId = hash.substring(8);
        console.log('Public route detected, shareId:', shareId);
        showView('public');
        loadPublicBoard(shareId);
        return;
    }

    // Private routes require authentication
    if (!getCurrentUser()) {
        console.log('User not authenticated, showing login view');
        showLoginView();
        return;
    }

    console.log('User authenticated, handling private routes');
    if (!hash || hash === '#boards') {
        showView('boards');
    } else if (hash === '#tags') {
        showView('tags');
        showTagsView();
    } else if (hash.startsWith('#board/')) {
        const boardId = hash.substring(7);
        showView('board');
        onBoardLoadCallback(boardId);
    } else {
        window.location.hash = '#boards';
    }
}

function showView(view) {
    console.log('Showing view:', view);
    boardsView.style.display = 'none';
    boardView.style.display = 'none';
    publicView.style.display = 'none';
    if (tagsView) {
        tagsView.style.display = 'none';
    }

    if (view === 'boards') {
        boardsView.style.display = 'block';
        loadBoards();
        unsubscribePublicCards();
    } else if (view === 'tags') {
        if (tagsView) {
            tagsView.style.display = 'block';
        }
        unsubscribePublicCards();
    } else if (view === 'board') {
        boardView.style.display = 'block';
        unsubscribePublicCards();
    } else if (view === 'public') {
        publicView.style.display = 'block';
    }
}

export function navigateToBoards() {
    window.location.hash = '#boards';
}

export function navigateToBoard(boardId) {
    window.location.hash = `#board/${boardId}`;
}

export function navigateToTags() {
    window.location.hash = '#tags';
}

export function showLoginView() {
    boardsView.style.display = 'none';
    boardView.style.display = 'none';
    publicView.style.display = 'none';
    if (tagsView) {
        tagsView.style.display = 'none';
    }
}
