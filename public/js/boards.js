// Boards management module
import { boardsCollection, cardsCollection } from './firebase-init.js';
import { getCurrentUser } from './auth.js';
import { navigateToBoard, navigateToBoards } from './router.js';

let boardsUnsubscribe = null;
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

export function initBoardsUI() {
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
    if (!currentUser) return;

    try {
        const snapshot = await boardsCollection
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('Creating default board for new user');
            await boardsCollection.add({
                isPublic: false,
                name: 'My First Board',
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Wait for the newly created board to appear in the real-time listener
            // to prevent race condition where loadBoards fires before board is available
            await waitForBoardToAppear(currentUser.uid);
        }
    } catch (error) {
        console.error('Error ensuring default board:', error);
    }
}

async function waitForBoardToAppear(userId) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn('Timeout waiting for board to appear in listener');
            unsubscribe();
            resolve();
        }, 5000); // 5 second timeout to prevent infinite wait

        const unsubscribe = boardsCollection
            .where('userId', '==', userId)
            .limit(1)
            .onSnapshot((snapshot) => {
                if (!snapshot.empty) {
                    console.log('Default board appeared in listener');
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve();
                }
            });
    });
}

export function loadBoards() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Unsubscribe from previous listener if it exists
    if (boardsUnsubscribe) {
        boardsUnsubscribe();
    }

    boardsUnsubscribe = boardsCollection
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'asc')
        .onSnapshot(async (snapshot) => {
            // Increment generation for this snapshot
            const currentGeneration = ++boardsGeneration;

            // Create all board elements in parallel
            const boardElements = await Promise.all(
                snapshot.docs.map(doc => createBoardElement(doc.id, doc.data()))
            );

            // Only update DOM if this is still the latest snapshot
            if (currentGeneration === boardsGeneration) {
                boardsList.innerHTML = '';
                boardElements.forEach(element => {
                    boardsList.appendChild(element);
                });
            }
        });
}

async function createBoardElement(id, board) {
    const currentUser = getCurrentUser();
    const boardDiv = document.createElement('div');
    boardDiv.className = 'board-item';
    boardDiv.onclick = () => navigateToBoard(id);

    // Get card count for this board
    const cardsSnapshot = await cardsCollection
        .where('userId', '==', currentUser.uid)
        .where('boardId', '==', id)
        .get();

    const cardCount = cardsSnapshot.size;
    const publicBadge = board.isPublic ? '<span class="public-badge" title="This board is public">🌐</span>' : '';
    boardDiv.innerHTML = `
        <div class="board-item-name">${publicBadge} ${board.name}</div>
        <div class="board-item-count">${cardCount} ${cardCount === 1 ? 'card' : 'cards'}</div>
    `;

    return boardDiv;
}

export async function loadBoard(boardId) {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardId) return;

    currentBoardId = boardId;

    try {
        // Add retry logic for newly created boards
        let doc = await boardsCollection.doc(boardId).get();
        let retries = 0;
        const maxRetries = 3;
        
        // If document doesn't exist or can't be read, retry a few times
        while ((!doc.exists || !doc.data()) && retries < maxRetries) {
            console.log(`Board not immediately available, retrying... (attempt ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            doc = await boardsCollection.doc(boardId).get();
            retries++;
        }
        
        if (!doc.exists || !doc.data() || doc.data().userId !== currentUser.uid) {
            alert('Board not found');
            navigateToBoards();
            return;
        }

        const board = doc.data();
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
    if (!name || !name.trim()) return;

    try {
        await boardsCollection.add({
            name: name.trim(),
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPublic: false
        });
    } catch (error) {
        console.error('Error creating board:', error);
        alert('Failed to create board. Please try again.');
    }
}

async function handleRenameBoard() {
    if (!currentBoardId) return;

    const doc = await boardsCollection.doc(currentBoardId).get();
    const currentName = doc.data().name;
    const newName = prompt('Enter new board name:', currentName);

    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    try {
        await boardsCollection.doc(currentBoardId).update({
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
    if (!currentBoardId) return;

    if (!confirm('Are you sure you want to delete this board? All cards in this board will also be deleted.')) {
        return;
    }

    try {
        // Delete all cards in the board
        const cardsSnapshot = await cardsCollection
            .where('userId', '==', currentUser.uid)
            .where('boardId', '==', currentBoardId)
            .get();

        const batch = firebase.firestore().batch();
        cardsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the board
        batch.delete(boardsCollection.doc(currentBoardId));

        await batch.commit();
        navigateToBoards();
    } catch (error) {
        console.error('Error deleting board:', error);
        alert('Failed to delete board. Please try again.');
    }
}

function generateShareId() {
    // Generate a random alphanumeric string for public share ID
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function handleTogglePublic() {
    if (!currentBoardId || !currentBoardData) return;

    try {
        if (currentBoardData.isPublic) {
            // Remove public access
            if (!confirm('Are you sure you want to make this board private? The public link will no longer work.')) {
                return;
            }
            await boardsCollection.doc(currentBoardId).update({
                isPublic: false,
                publicShareId: firebase.firestore.FieldValue.delete()
            });
            currentBoardData.isPublic = false;
            delete currentBoardData.publicShareId;
        } else {
            // Make public
            const shareId = generateShareId();
            await boardsCollection.doc(currentBoardId).update({
                isPublic: true,
                publicShareId: shareId
            });
            currentBoardData.isPublic = true;
            currentBoardData.publicShareId = shareId;
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
