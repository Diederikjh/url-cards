// Boards management UI module
import { getCurrentUser } from './auth.js';
import { navigateToBoard, navigateToBoards } from './router.js';

let boardService = null;

let boardsGeneration = 0;
export let currentBoardId = null;
export let currentBoardData = null;

// DOM elements
let boardsList;
let boardName;
let createBoardBtn;
let backToBoards;
let renameBoardBtn;
let deleteBoardBtn;
let sharePublicBtn;
let publicLinkContainer;

let boardsUnsubscribe = null;

/**
 * Initialize the boards UI
 * @param {BoardService} service - The board service to use
 */
export function initBoardsUI(service) {
    boardService = service;

    boardsList = document.getElementById('boardsList');
    boardName = document.getElementById('boardName');
    createBoardBtn = document.getElementById('createBoardBtn');
    backToBoards = document.getElementById('backToBoards');
    renameBoardBtn = document.getElementById('renameBoardBtn');
    deleteBoardBtn = document.getElementById('deleteBoardBtn');
    sharePublicBtn = document.getElementById('sharePublicBtn');
    publicLinkContainer = document.getElementById('publicLinkContainer');

    createBoardBtn.addEventListener('click', handleCreateBoard);
    backToBoards.addEventListener('click', () => navigateToBoards());
    renameBoardBtn.addEventListener('click', handleRenameBoard);
    deleteBoardBtn.addEventListener('click', handleDeleteBoard);
    sharePublicBtn.addEventListener('click', handleTogglePublic);
}

export async function ensureDefaultBoard() {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardService) return;

    try {
        await boardService.ensureDefaultBoard(currentUser.uid);
    } catch (error) {
        console.error('Error ensuring default board:', error);
    }
}

export function loadBoards() {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardService) return;

    // Unsubscribe from previous listener if it exists
    if (boardsUnsubscribe) {
        boardsUnsubscribe();
    }

    boardsUnsubscribe = boardService.watchBoards(currentUser.uid, async (boards) => {
        // Increment generation for this update
        const currentGeneration = ++boardsGeneration;

        // Create all board elements in parallel
        const boardElements = await Promise.all(
            boards.map(board => createBoardElement(board))
        );

        // Only update DOM if this is still the latest update
        if (currentGeneration === boardsGeneration) {
            boardsList.innerHTML = '';
            boardElements.forEach(element => {
                boardsList.appendChild(element);
            });
        }
    });
}

async function createBoardElement(board) {
    try {
        const currentUser = getCurrentUser();
        const boardDiv = document.createElement('div');
        boardDiv.className = 'board-item';
        boardDiv.onclick = () => navigateToBoard(board.id);

        // Get card count for this board
        const cardCount = await boardService.getCardCount(board.id, currentUser.uid);

        const publicBadge = board.isPublic ? '<span class="public-badge" title="This board is public">🌐</span>' : '';
        boardDiv.innerHTML = `
            <div class="board-item-name">${publicBadge} ${board.name}</div>
            <div class="board-item-count">${cardCount} ${cardCount === 1 ? 'card' : 'cards'}</div>
        `;

        return boardDiv;
    } catch (error) {
        console.error('Error creating board element:', error);
        const boardDiv = document.createElement('div');
        boardDiv.className = 'board-item';
        boardDiv.innerHTML = `<div class="board-item-name">${board.name}</div>`;
        return boardDiv;
    }
}

export async function loadBoard(boardId) {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardId || !boardService) return;

    currentBoardId = boardId;

    try {
        // Add retry logic for newly created boards
        let board = null;
        let retries = 0;
        const maxRetries = 3;

        while (!board && retries < maxRetries) {
            try {
                board = await boardService.getBoard(boardId, currentUser.uid);
            } catch (error) {
                if (retries < maxRetries - 1) {
                    console.log(`Board not immediately available, retrying... (attempt ${retries + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    throw error;
                }
            }
            retries++;
        }

        if (!board) {
            alert('Board not found');
            navigateToBoards();
            return;
        }

        currentBoardData = board;
        boardName.textContent = board.name;
        updatePublicLinkUI(board);
    } catch (error) {
        console.error('Error loading board:', error);
        alert('Failed to load board');
        navigateToBoards();
    }
}

async function handleCreateBoard() {
    const currentUser = getCurrentUser();
    const name = prompt('Enter board name:');
    if (!name || !name.trim() || !boardService) return;

    try {
        await boardService.createBoard(currentUser.uid, name.trim());
    } catch (error) {
        console.error('Error creating board:', error);
        alert('Failed to create board. Please try again.');
    }
}

async function handleRenameBoard() {
    if (!currentBoardId || !boardService) return;

    try {
        const board = await boardService.getBoard(currentBoardId, getCurrentUser().uid);
        const newName = prompt('Enter new board name:', board.name);

        if (!newName || !newName.trim() || newName.trim() === board.name) return;

        await boardService.updateBoard(currentBoardId, {
            name: newName.trim()
        });
        boardName.textContent = newName.trim();
    } catch (error) {
        console.error('Error renaming board:', error);
        alert('Failed to rename board. Please try again.');
    }
}

async function handleDeleteBoard() {
    const currentUser = getCurrentUser();
    if (!currentBoardId || !boardService) return;

    if (!confirm('Are you sure you want to delete this board? All cards in this board will also be deleted.')) {
        return;
    }

    try {
        await boardService.deleteBoard(currentBoardId, currentUser.uid);
        navigateToBoards();
    } catch (error) {
        console.error('Error deleting board:', error);
        alert('Failed to delete board. Please try again.');
    }
}

async function handleTogglePublic() {
    if (!currentBoardId || !currentBoardData || !boardService) return;

    try {
        if (currentBoardData.isPublic) {
            // Remove public access
            if (!confirm('Are you sure you want to make this board private? The public link will no longer work.')) {
                return;
            }
            await boardService.togglePublic(currentBoardId, false);
            currentBoardData.isPublic = false;
            delete currentBoardData.publicShareId;
        } else {
            // Make public
            await boardService.togglePublic(currentBoardId, true);
            // Fetch updated board to get the publicShareId
            const currentUser = getCurrentUser();
            currentBoardData = await boardService.getBoard(currentBoardId, currentUser.uid);
        }
        updatePublicLinkUI(currentBoardData);
    } catch (error) {
        console.error('Error toggling public access:', error);
        alert('Failed to update board access. Please try again.');
    }
}

function updatePublicLinkUI(board) {
    if (board.isPublic && board.publicShareId) {
        const publicUrl = `${window.location.origin}${window.location.pathname}#public/${board.publicShareId}`;
        sharePublicBtn.textContent = 'Remove Public Access';
        sharePublicBtn.classList.add('public-active');
        publicLinkContainer.style.display = 'block';
        publicLinkContainer.innerHTML = `
            <div class="public-link">
                <label>Public Link:</label>
                <input type="text" value="${publicUrl}" readonly class="public-link-input" />
                <button onclick="window.copyPublicLink('${publicUrl}')" class="copy-link-btn">Copy Link</button>
            </div>
        `;
    } else {
        sharePublicBtn.textContent = 'Make Public';
        sharePublicBtn.classList.remove('public-active');
        publicLinkContainer.style.display = 'none';
        publicLinkContainer.innerHTML = '';
    }
}

export function copyPublicLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Public link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link');
    });
}

window.copyPublicLink = copyPublicLink;
