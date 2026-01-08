// Boards management module
import { boardsCollection, cardsCollection } from './firebase-init.js';
import { getCurrentUser } from './auth.js';
import { navigateToBoard, navigateToBoards } from './router.js';

let boardsUnsubscribe = null;
let boardsGeneration = 0;
export let currentBoardId = null;

// DOM elements
let boardsList;
let boardName;
let createBoardBtn;
let backToBoards;
let renameBoardBtn;
let deleteBoardBtn;

export function initBoardsUI() {
    boardsList = document.getElementById('boardsList');
    boardName = document.getElementById('boardName');
    createBoardBtn = document.getElementById('createBoardBtn');
    backToBoards = document.getElementById('backToBoards');
    renameBoardBtn = document.getElementById('renameBoardBtn');
    deleteBoardBtn = document.getElementById('deleteBoardBtn');

    createBoardBtn.addEventListener('click', handleCreateBoard);
    backToBoards.addEventListener('click', () => navigateToBoards());
    renameBoardBtn.addEventListener('click', handleRenameBoard);
    deleteBoardBtn.addEventListener('click', handleDeleteBoard);
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
                name: 'My First Board',
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error ensuring default board:', error);
    }
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

    boardDiv.innerHTML = `
        <div class="board-item-name">${board.name}</div>
        <div class="board-item-count">${cardCount} ${cardCount === 1 ? 'card' : 'cards'}</div>
    `;

    return boardDiv;
}

export async function loadBoard(boardId) {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardId) return;

    currentBoardId = boardId;

    try {
        const doc = await boardsCollection.doc(boardId).get();
        if (!doc.exists || doc.data().userId !== currentUser.uid) {
            alert('Board not found');
            navigateToBoards();
            return;
        }

        const board = doc.data();
        boardName.textContent = board.name;
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
