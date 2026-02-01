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
    cardDiv.dataset.tags = JSON.stringify(Array.isArray(card.tags) ? card.tags : []);

    const imageHtml = card.imageUrl ?
        `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` :
        '';

    cardDiv.innerHTML = `
        ${imageHtml}
        <div class="card-content">
            <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description || ''}</div>
            <div class="card-tags" data-public-card-tags></div>
        </div>
    `;
    renderPublicTags(cardDiv);
    return cardDiv;
}

function renderPublicTags(cardEl) {
    const container = cardEl.querySelector('[data-public-card-tags]');
    if (!container) return;
    let tags = [];
    try {
        tags = JSON.parse(cardEl.dataset.tags || '[]');
    } catch (_) {
        tags = [];
    }

    const chips = tags.map((tag) => {
        if (!tag || !tag.name) return '';
        return `
            <span class="tag-chip" style="background:${tag.color}; color:${getTextColor(tag.color)};">
                ${tag.name}
            </span>
        `;
    }).join('');

    if (!chips) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `<div class="tag-chips">${chips}</div>`;
}

function getTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '#1f2933';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#1f2933';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.6 ? '#1f2933' : '#f9fafb';
}

export function unsubscribePublicCards() {
    if (publicCardsUnsubscribe) {
        publicCardsUnsubscribe();
    }
}
