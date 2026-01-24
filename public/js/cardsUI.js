// Cards management UI module
import { getCurrentUser } from './auth.js';
import { currentBoardId } from './boardsUI.js';

let cardService = null;
let cardsUnsubscribe = null;
let isReadOnly = false;

// DOM elements
let urlInput;
let addCardBtn;
let sortSelect;
let cardsContainer;
let currentCards = []; // Store cards for sorting logic

/**
 * Initialize the cards UI
 * @param {CardService} service - The card service to use
 */
export function initCardsUI(service) {
    cardService = service;

    urlInput = document.getElementById('urlInput');
    addCardBtn = document.getElementById('addCardBtn');
    sortSelect = document.getElementById('sortSelect');
    cardsContainer = document.getElementById('cardsContainer');

    addCardBtn.addEventListener('click', handleAddCard);
    urlInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleAddCard();
        }
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
}

export function loadCards(boardId) {
    isReadOnly = false;
    const currentUser = getCurrentUser();
    if (!currentUser || !boardId || !cardService) {
        console.log('Cannot load cards: missing user, board, or service');
        return;
    }

    // Unsubscribe from previous listener if it exists
    if (cardsUnsubscribe) {
        cardsUnsubscribe();
    }

    cardsUnsubscribe = cardService.watchCards(currentUser.uid, boardId, (cards) => {
        currentCards = cards; // Store for sorting
        cardsContainer.innerHTML = '';
        cards.forEach((card) => {
            const cardElement = createCardElement(card);
            cardsContainer.appendChild(cardElement);
        });
    });
}

async function handleSort() {
    if (!currentCards || currentCards.length === 0 || !cardService) return;

    const sortType = sortSelect.value;
    const updates = {};
    const sortedCards = [...currentCards];

    // Disable select while sorting
    sortSelect.disabled = true;

    try {
        // Sort in memory first
        sortedCards.sort((a, b) => {
            switch (sortType) {
                case 'created_desc':
                    // Compare timestamps descending
                    return b.createdAt.toMillis() - a.createdAt.toMillis();
                case 'created_asc':
                    // Compare timestamps ascending
                    return a.createdAt.toMillis() - b.createdAt.toMillis();
                case 'name_asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'name_desc':
                    return (b.title || '').localeCompare(a.title || '');
                default:
                    return 0;
            }
        });

        // Calculate new ranks
        sortedCards.forEach((card, index) => {
            let newRank;
            if (sortType === 'created_desc') {
                // Default: -timestamp
                newRank = -card.createdAt.toMillis();
            } else if (sortType === 'created_asc') {
                // Oldest first: timestamp
                newRank = card.createdAt.toMillis();
            } else {
                // Name/Custom: index * 1000
                newRank = index * 1000;
            }

            // Only update if rank is different (optimization)
            // But for timestamps, we usually want to reset to exact timestamp mapping if switching back to Created
            // For custom sort (Name), we definitely need to reindex.
            updates[card.id] = newRank;
        });

        await cardService.updateCardRanks(updates);

    } catch (error) {
        console.error('Error sorting cards:', error);
        alert('Failed to update sort order.');
    } finally {
        sortSelect.disabled = false;
    }
}

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.setAttribute('data-card-id', card.id);

    const imageHtml = card.imageUrl ?
        `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` :
        '';

    // In read-only mode, don't show edit/delete buttons
    const actionsHtml = isReadOnly ? '' : `
        <div class="card-actions">
            <button class="edit-btn" onclick="window.editCard('${card.id}')">Edit</button>
            <button class="delete-btn" onclick="window.deleteCard('${card.id}')">Delete</button>
        </div>
    `;

    cardDiv.innerHTML = `
        ${imageHtml}
        <div class="card-content">
            <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
            <div class="card-title" data-field="title">${card.title}</div>
            <div class="card-description" data-field="description">${card.description}</div>
            ${actionsHtml}
        </div>
    `;
    return cardDiv;
}

async function handleAddCard() {
    const url = urlInput.value.trim();
    if (!url || !cardService) return;

    if (!isValidUrl(url)) {
        alert('Please enter a valid URL');
        return;
    }

    addCardBtn.disabled = true;
    addCardBtn.textContent = 'Adding...';

    try {
        const metadata = await extractMetadata(url);
        await addCard(url, metadata.title, metadata.description, metadata.imageUrl);
        urlInput.value = '';
    } catch (error) {
        console.error('Error adding card:', error);
        alert('Failed to add card. Please try again.');
    } finally {
        addCardBtn.disabled = false;
        addCardBtn.textContent = 'Add Card';
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function extractMetadata(url) {
    try {
        console.log('Calling Firebase Function to extract metadata for:', url);
        const functions = firebase.app().functions(CONFIG.REGION);
        const extractMetadataFunc = functions.httpsCallable('extractMetadata');
        const result = await extractMetadataFunc({ url });

        console.log('Metadata extraction result:', result.data);
        return {
            title: result.data.title,
            description: result.data.description,
            imageUrl: result.data.imageUrl
        };
    } catch (error) {
        console.warn('Firebase Function failed, using fallback:', error);
        return {
            title: new URL(url).hostname,
            description: 'Click to edit description'
        };
    }
}

async function addCard(url, title, description, imageUrl) {
    const currentUser = getCurrentUser();
    if (!currentUser || !cardService) {
        console.error('No user signed in or card service not available');
        return;
    }

    if (!currentBoardId) {
        console.error('No board selected');
        return;
    }

    const cardData = {
        url,
        title,
        description,
        imageUrl
    };

    await cardService.createCard(currentUser.uid, currentBoardId, cardData);
}

// Store original content for cancel
let editingCardId = null;
let originalTitle = null;
let originalDescription = null;
let editHandlers = {}; // Store handlers by cardId

// Export card editing functions to window for onclick handlers
window.editCard = function (cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');
    const editBtn = card.querySelector('.edit-btn');

    // Store original content
    editingCardId = cardId;
    originalTitle = titleEl.textContent;
    originalDescription = descEl.textContent;

    titleEl.contentEditable = true;
    descEl.contentEditable = true;
    titleEl.focus();

    editBtn.textContent = 'Save';
    editBtn.onclick = () => window.saveCard(cardId);
    editBtn.className = 'save-btn';

    // Add keyboard and click handlers
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            window.cancelCard(cardId);
        }
    };

    const handleClickAway = (e) => {
        if (!card.contains(e.target)) {
            window.cancelCard(cardId);
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickAway);

    // Store handlers for cleanup
    editHandlers[cardId] = { handleKeyDown, handleClickAway };
}

window.saveCard = async function (cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card || !cardService) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');

    const newTitle = titleEl.textContent.trim();
    const newDescription = descEl.textContent.trim();

    try {
        await cardService.updateCard(cardId, {
            title: newTitle,
            description: newDescription
        });

        // Clear edit state
        window.exitEditMode(cardId);
    } catch (error) {
        console.error('Error updating card:', error);
        alert('Failed to save changes. Please try again.');
    }
}

window.cancelCard = function (cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');

    // Restore original content
    if (originalTitle !== null) titleEl.textContent = originalTitle;
    if (originalDescription !== null) descEl.textContent = originalDescription;

    window.exitEditMode(cardId);
}

window.exitEditMode = function (cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');
    const btn = card.querySelector('.save-btn') || card.querySelector('.edit-btn');

    titleEl.contentEditable = false;
    descEl.contentEditable = false;

    if (btn) {
        btn.textContent = 'Edit';
        btn.onclick = () => window.editCard(cardId);
        btn.className = 'edit-btn';
    }

    // Remove event listeners using stored handlers
    if (editHandlers[cardId]) {
        document.removeEventListener('keydown', editHandlers[cardId].handleKeyDown);
        document.removeEventListener('click', editHandlers[cardId].handleClickAway);
        delete editHandlers[cardId];
    }
    editingCardId = null;
}

window.deleteCard = async function (cardId) {
    if (confirm('Are you sure you want to delete this card?')) {
        try {
            await cardService.deleteCard(cardId);
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Failed to delete card. Please try again.');
        }
    }
}

export function setReadOnly(readOnly) {
    isReadOnly = readOnly;
}
