// Cards management module
import { cardsCollection } from './firebase-init.js';
import { getCurrentUser } from './auth.js';
import { currentBoardId } from './boards.js';

let cardsUnsubscribe = null;

// DOM elements
let urlInput;
let addCardBtn;
let cardsContainer;

export function initCardsUI() {
    urlInput = document.getElementById('urlInput');
    addCardBtn = document.getElementById('addCardBtn');
    cardsContainer = document.getElementById('cardsContainer');

    addCardBtn.addEventListener('click', handleAddCard);
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAddCard();
        }
    });
}

export function loadCards(boardId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.log('No user signed in, not loading cards');
        return;
    }

    if (!boardId) {
        console.log('No board selected');
        return;
    }

    // Unsubscribe from previous listener if it exists
    if (cardsUnsubscribe) {
        cardsUnsubscribe();
    }

    cardsUnsubscribe = cardsCollection
        .where('userId', '==', currentUser.uid)
        .where('boardId', '==', boardId)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            cardsContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                const card = doc.data();
                const cardElement = createCardElement(doc.id, card);
                cardsContainer.appendChild(cardElement);
            });
        });
}

function createCardElement(id, card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.setAttribute('data-card-id', id);

    const imageHtml = card.imageUrl ?
        `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` :
        '';

    cardDiv.innerHTML = `
        ${imageHtml}
        <div class="card-content">
            <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
            <div class="card-title" data-field="title">${card.title}</div>
            <div class="card-description" data-field="description">${card.description}</div>
            <div class="card-actions">
                <button class="edit-btn" onclick="window.editCard('${id}')">Edit</button>
                <button class="delete-btn" onclick="window.deleteCard('${id}')">Delete</button>
            </div>
        </div>
    `;
    return cardDiv;
}

async function handleAddCard() {
    const url = urlInput.value.trim();
    if (!url) return;

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
    if (!currentUser) {
        console.error('No user signed in');
        return;
    }

    if (!currentBoardId) {
        console.error('No board selected');
        return;
    }

    const card = {
        url: url,
        title: title,
        description: description,
        imageUrl: imageUrl,
        userId: currentUser.uid,
        boardId: currentBoardId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await cardsCollection.add(card);
}

// Export card editing functions to window for onclick handlers
window.editCard = function(cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');
    const editBtn = card.querySelector('.edit-btn');

    titleEl.contentEditable = true;
    descEl.contentEditable = true;
    titleEl.focus();

    editBtn.textContent = 'Save';
    editBtn.onclick = () => window.saveCard(cardId);
    editBtn.className = 'save-btn';
}

window.saveCard = async function(cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');
    const saveBtn = card.querySelector('.save-btn');

    const newTitle = titleEl.textContent.trim();
    const newDescription = descEl.textContent.trim();

    try {
        await cardsCollection.doc(cardId).update({
            title: newTitle,
            description: newDescription
        });

        titleEl.contentEditable = false;
        descEl.contentEditable = false;

        saveBtn.textContent = 'Edit';
        saveBtn.onclick = () => window.editCard(cardId);
        saveBtn.className = 'edit-btn';
    } catch (error) {
        console.error('Error updating card:', error);
        alert('Failed to save changes. Please try again.');
    }
}

window.deleteCard = async function(cardId) {
    if (confirm('Are you sure you want to delete this card?')) {
        try {
            await cardsCollection.doc(cardId).delete();
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Failed to delete card. Please try again.');
        }
    }
}
