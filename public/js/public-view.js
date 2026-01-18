// Public board view module
let boardService;
let cardService;

let publicCardsUnsubscribe = null;

// DOM elements
let publicBoardTitle;
let publicCardsContainer;
let publicBoardBadge;

/**
 * Initialize the public view UI
 * @param {BoardService} bService - The board service to use
 * @param {CardService} cService - The card service to use
 */
export function initPublicUI(bService, cService) {
    boardService = bService;
    cardService = cService;

    publicBoardTitle = document.getElementById('publicBoardTitle');
    publicCardsContainer = document.getElementById('publicCardsContainer');
    publicBoardBadge = document.getElementById('publicBoardBadge');
    
    if (!publicBoardTitle || !publicCardsContainer || !publicBoardBadge) {
        console.error('Public UI elements not found in DOM');
    } else {
        console.log('Public UI initialized successfully');
    }
}

export async function loadPublicBoard(shareId) {
    console.log('Loading public board with shareId:', shareId);
    try {
        if (!boardService) {
            throw new Error('Board service not initialized');
        }

        // Get board by share ID
        const board = await boardService.getPublicBoard(shareId);

        console.log('Board loaded:', board.name);

        // Update title
        publicBoardTitle.textContent = board.name;
        publicBoardBadge.textContent = 'Public Board';
        publicBoardBadge.style.display = 'inline';

        // Load public cards
        loadPublicCards(board.id);

        return board.id;
    } catch (error) {
        console.error('Error loading public board:', error);
        publicBoardTitle.textContent = 'Board not found';
        publicCardsContainer.innerHTML = '<p>This public board does not exist or has been made private.</p>';
        return null;
    }
}

function loadPublicCards(boardId) {
    if (!cardService) {
        console.error('Card service not initialized');
        return;
    }

    // Unsubscribe from previous listener if it exists
    if (publicCardsUnsubscribe) {
        publicCardsUnsubscribe();
    }

    publicCardsUnsubscribe = cardService.watchPublicBoardCards(boardId, (cards) => {
        publicCardsContainer.innerHTML = '';
        cards.forEach((card) => {
            const cardElement = createPublicCardElement(card);
            publicCardsContainer.appendChild(cardElement);
        });
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
