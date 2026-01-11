// Public board view module
import { boardsCollection, cardsCollection } from './firebase-init.js';

let publicCardsUnsubscribe = null;

// DOM elements
let publicBoardTitle;
let publicCardsContainer;
let publicBoardBadge;

export function initPublicUI() {
    publicBoardTitle = document.getElementById('publicBoardTitle');
    publicCardsContainer = document.getElementById('publicCardsContainer');
    publicBoardBadge = document.getElementById('publicBoardBadge');
}

export async function loadPublicBoard(shareId) {
    try {
        // Find board by publicShareId
        const snapshot = await boardsCollection
            .where('publicShareId', '==', shareId)
            .where('isPublic', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            publicBoardTitle.textContent = 'Board not found';
            publicCardsContainer.innerHTML = '<p>This public board does not exist or has been made private.</p>';
            return null;
        }

        const boardDoc = snapshot.docs[0];
        const board = boardDoc.data();
        const boardId = boardDoc.id;

        // Update title
        publicBoardTitle.textContent = board.name;
        publicBoardBadge.textContent = 'Public Board';
        publicBoardBadge.style.display = 'inline';

        // Load public cards
        loadPublicCards(boardId);

        return boardId;
    } catch (error) {
        console.error('Error loading public board:', error);
        publicBoardTitle.textContent = 'Error loading board';
        publicCardsContainer.innerHTML = '<p>Failed to load public board.</p>';
        return null;
    }
}

function loadPublicCards(boardId) {
    // Unsubscribe from previous listener if it exists
    if (publicCardsUnsubscribe) {
        publicCardsUnsubscribe();
    }

    publicCardsUnsubscribe = cardsCollection
        .where('boardId', '==', boardId)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            publicCardsContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                const card = doc.data();
                const cardElement = createPublicCardElement(card);
                publicCardsContainer.appendChild(cardElement);
            });
        }, (error) => {
            console.error('Error loading public cards:', error);
            publicCardsContainer.innerHTML = '<p>Failed to load cards.</p>';
        });
}

function createPublicCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card public-card';

    const imageHtml = card.imageUrl ?
        `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` :
        '';

    cardDiv.innerHTML = `
        ${imageHtml}
        <div class="card-content">
            <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description}</div>
        </div>
    `;
    return cardDiv;
}

export function unsubscribePublicCards() {
    if (publicCardsUnsubscribe) {
        publicCardsUnsubscribe();
    }
}
