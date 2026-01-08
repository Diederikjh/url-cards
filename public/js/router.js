// Routing module
import { getCurrentUser } from './auth.js';
import { loadBoards } from './boards.js';

let boardsView;
let boardView;
let onBoardLoadCallback;

export function initRouter(onBoardLoad) {
    boardsView = document.getElementById('boardsView');
    boardView = document.getElementById('boardView');
    onBoardLoadCallback = onBoardLoad;

    window.addEventListener('hashchange', handleRouting);
}

export function handleRouting() {
    if (!getCurrentUser()) {
        return;
    }

    const hash = window.location.hash;

    if (!hash || hash === '#boards') {
        showView('boards');
    } else if (hash.startsWith('#board/')) {
        const boardId = hash.substring(7);
        showView('board');
        onBoardLoadCallback(boardId);
    } else {
        window.location.hash = '#boards';
    }
}

function showView(view) {
    boardsView.style.display = 'none';
    boardView.style.display = 'none';

    if (view === 'boards') {
        boardsView.style.display = 'block';
        loadBoards();
    } else if (view === 'board') {
        boardView.style.display = 'block';
    }
}

export function navigateToBoards() {
    window.location.hash = '#boards';
}

export function navigateToBoard(boardId) {
    window.location.hash = `#board/${boardId}`;
}

export function showLoginView() {
    boardsView.style.display = 'none';
    boardView.style.display = 'none';
}
