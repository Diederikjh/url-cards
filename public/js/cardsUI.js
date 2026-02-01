// Cards management UI module
import { getCurrentUser } from './auth.js';
import { currentBoardId } from './boardsUI.js';
import { onTagsUpdated, getTagByNameLower } from './tagStore.js';
import { pickRandomTagColor, getReadableTextColor } from './tagPalette.js';
import { buildAvailableTagOptions, cardMatchesTagFilter } from './rules/tagFilter.mjs';
import { buildRankUpdatesForSort, buildRankUpdatesForOrder, compareCards } from './rules/cardSorting.mjs';
import { getTagSuggestions } from './rules/tagSuggestions.mjs';
import { normalizeTagName } from './rules/tagValidation.mjs';
import { renderCardTagsWithFallback, enableTagEditing as enableTagEditingView, disableTagEditing as disableTagEditingView, backfillCardTags, commitPendingInput } from './tagsView.js';

let cardService = null;
let tagService = null;
let cardsUnsubscribe = null;
let isReadOnly = false;

// DOM elements
let urlInput;
let addCardBtn;
let sortSelect;
let cardsContainer;
let currentCards = []; // Store cards for sorting logic
let tagFilterPanel;
let tagFilterList;
let tagFilterEmpty;
let clearTagFilterBtn;
let tagFilterToggleBtn;
let tagFilterActiveLabel;
let tagMap = new Map();
let tagNameMap = new Map();
let tagsUnsubscribe = null;
let selectedTagFilterId = null;
let isFilterPanelOpen = false;
let handleFilterClickAway = null;
let dragState = {
    draggingEl: null,
    startOrder: [],
    handleKeyDown: null,
    didCancel: false,
    pointerId: null,
    pendingPointerTimer: null,
    pendingPointerTarget: null,
    pointerCaptureTarget: null,
    pointerStartX: 0,
    pointerStartY: 0,
    lastPointer: null,
    isPointerDrag: false,
    autoScrollRaf: null,
    autoScrollVelocity: 0
};
const POINTER_DRAG_DELAY_MS = 180;
const POINTER_DRAG_THRESHOLD_PX = 8;
const AUTO_SCROLL_MARGIN_PX = 90;
const AUTO_SCROLL_MAX_SPEED = 14;
const AUTO_SCROLL_STEP_DIVISOR = 6;

function supportsNativeDrag() {
    if (!window.matchMedia) return true;
    return !window.matchMedia('(pointer: coarse)').matches;
}

function isInteractiveTarget(target) {
    return !!target.closest('a, button, input, textarea, select, [contenteditable="true"]');
}

function isTouchDevice() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Initialize the cards UI
 * @param {CardService} service - The card service to use
 */
export function initCardsUI(service, tagSvc) {
    cardService = service;
    tagService = tagSvc;

    urlInput = document.getElementById('urlInput');
    addCardBtn = document.getElementById('addCardBtn');
    sortSelect = document.getElementById('sortSelect');
    cardsContainer = document.getElementById('cardsContainer');
    tagFilterPanel = document.getElementById('tagFilterPanel');
    tagFilterList = document.getElementById('tagFilterList');
    tagFilterEmpty = document.getElementById('tagFilterEmpty');
    clearTagFilterBtn = document.getElementById('clearTagFilterBtn');
    tagFilterToggleBtn = document.getElementById('tagFilterToggleBtn');
    tagFilterActiveLabel = document.getElementById('tagFilterActiveLabel');

    addCardBtn.addEventListener('click', handleAddCard);
    urlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            handleAddCard();
        }
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }

    if (cardsContainer) {
        cardsContainer.addEventListener('dragover', handleContainerDragOver);
        cardsContainer.addEventListener('drop', handleContainerDrop);
    }

    if (clearTagFilterBtn) {
        clearTagFilterBtn.addEventListener('click', () => {
            setActiveTagFilter(null);
            setFilterPanelOpen(false);
        });
    }

    if (tagFilterToggleBtn) {
        tagFilterToggleBtn.addEventListener('click', () => setFilterPanelOpen(!isFilterPanelOpen));
    }

    if (!handleFilterClickAway) {
        handleFilterClickAway = (event) => {
            if (!isFilterPanelOpen || !tagFilterPanel) return;
            if (tagFilterPanel.contains(event.target)) return;
            setFilterPanelOpen(false);
        };
        document.addEventListener('click', handleFilterClickAway);
    }

    setFilterPanelOpen(false);

    if (tagsUnsubscribe) {
        tagsUnsubscribe();
    }
    tagsUnsubscribe = onTagsUpdated((snapshot) => {
        tagMap = snapshot.tagsById;
        tagNameMap = snapshot.tagsByNameLower;
        refreshAllCardTags();
        updateTagFilterOptions(currentCards);
    });
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
        updateTagFilterOptions(cards);
        applyTagFilterToCards();
    });
}

async function handleSort() {
    if (!currentCards || currentCards.length === 0 || !cardService) return;

    const sortType = sortSelect.value;
    if (sortType === 'custom') return;
    const sortedCards = [...currentCards];

    // Disable select while sorting
    sortSelect.disabled = true;

    try {
        // Sort in memory first
        sortedCards.sort((a, b) => compareCards(a, b, sortType));
        await applyRankUpdates(buildRankUpdatesForSort(sortedCards, sortType));

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
    cardDiv.dataset.dragDisabled = 'false';
    const tags = Array.isArray(card.tags) ? card.tags : [];
    const tagIds = Array.isArray(card.tagIds) && card.tagIds.length > 0
        ? card.tagIds
        : tags.map(tag => tag.id).filter(Boolean);
    cardDiv.dataset.tagIds = JSON.stringify(tagIds);
    cardDiv.dataset.tags = JSON.stringify(tags);
    if (!isReadOnly) {
        const allowNativeDrag = supportsNativeDrag();
        cardDiv.draggable = allowNativeDrag;
        if (allowNativeDrag) {
            cardDiv.addEventListener('dragstart', handleDragStart);
            cardDiv.addEventListener('dragend', handleDragEnd);
            cardDiv.addEventListener('dragover', handleCardDragOver);
            cardDiv.addEventListener('drop', handleCardDrop);
        }
        cardDiv.addEventListener('pointerdown', handlePointerDown, { passive: false });
        cardDiv.addEventListener('touchstart', handleTouchStart, { passive: false });
        cardDiv.addEventListener('contextmenu', (event) => {
            if (!supportsNativeDrag()) {
                event.preventDefault();
            }
        });
    }

    const imageHtml = card.imageUrl ?
        `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` :
        '';

    // In read-only mode, don't show edit/delete buttons
    const actionsHtml = isReadOnly ? '' : `
        <div class="card-actions">
            <button class="edit-btn" data-testid="card-edit-btn" onclick="window.editCard('${card.id}')">Edit</button>
            <button class="delete-btn" data-testid="card-delete-btn" onclick="window.deleteCard('${card.id}')">Delete</button>
        </div>
    `;

    cardDiv.innerHTML = `
        ${imageHtml}
        <div class="card-content">
            <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
            <div class="card-title" data-field="title">${card.title}</div>
            <div class="card-description" data-field="description">${card.description}</div>
            <div class="card-tags" data-card-tags></div>
            ${actionsHtml}
        </div>
    `;
    renderCardTagsWithFallbackWrapper(cardDiv, getCardTags(cardDiv), false);
    return cardDiv;
}

function handleDragStart(event) {
    if (isReadOnly) return;
    if (isInteractiveTarget(event.target)) {
        event.preventDefault();
        return;
    }
    if (editingCardId) {
        window.cancelCard(editingCardId);
    }

    dragState.draggingEl = event.currentTarget;
    dragState.startOrder = getCurrentOrderIds();
    dragState.didCancel = false;
    dragState.isPointerDrag = false;
    dragState.draggingEl.classList.add('dragging');
    cardsContainer.classList.add('drag-active');

    dragState.handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cancelDrag();
        }
    };
    document.addEventListener('keydown', dragState.handleKeyDown);

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragState.draggingEl.dataset.cardId || '');
    }
}

function handleDragEnd(event) {
    if (!dragState.draggingEl) return;
    dragState.draggingEl.classList.remove('dragging');
    cardsContainer.classList.remove('drag-active');
    stopAutoScroll();
    if (dragState.handleKeyDown) {
        document.removeEventListener('keydown', dragState.handleKeyDown);
        dragState.handleKeyDown = null;
    }

    const dropEffect = event && event.dataTransfer ? event.dataTransfer.dropEffect : null;
    if (dropEffect === 'none' && dragState.startOrder.length) {
        dragState.didCancel = true;
        restoreOrder(dragState.startOrder);
    }

    const endOrder = getCurrentOrderIds();
    const orderChanged = !dragState.didCancel &&
        endOrder.length === dragState.startOrder.length &&
        endOrder.some((id, idx) => id !== dragState.startOrder[idx]);

    dragState.draggingEl = null;
    dragState.startOrder = [];
    dragState.didCancel = false;

    if (orderChanged) {
        persistOrderFromDom();
    }
}

function handleCardDragOver(event) {
    event.preventDefault();
    if (!dragState.draggingEl) return;
    updateAutoScroll(event.clientY);

    const targetCard = event.currentTarget;
    if (targetCard === dragState.draggingEl) return;

    const rect = targetCard.getBoundingClientRect();
    const shouldInsertAfter = (event.clientY - rect.top) > rect.height / 2;

    const referenceNode = shouldInsertAfter ? targetCard.nextSibling : targetCard;
    if (referenceNode !== dragState.draggingEl) {
        cardsContainer.insertBefore(dragState.draggingEl, referenceNode);
    }
}

function handleCardDrop(event) {
    event.preventDefault();
}

function handleContainerDragOver(event) {
    event.preventDefault();
    if (!dragState.draggingEl) return;
    updateAutoScroll(event.clientY);

    const target = event.target;
    if (target === cardsContainer && cardsContainer.lastElementChild !== dragState.draggingEl) {
        cardsContainer.appendChild(dragState.draggingEl);
    }
}

function handleContainerDrop(event) {
    event.preventDefault();
}

function handleTouchStart(event) {
    if (isReadOnly) return;
    if (!isTouchDevice()) return;
    if (isInteractiveTarget(event.target)) return;
    if (event.currentTarget?.dataset?.dragDisabled === 'true') return;
    if (editingCardId) {
        window.cancelCard(editingCardId);
    }
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    dragState.pointerId = null;
    dragState.pointerStartX = touch.clientX;
    dragState.pointerStartY = touch.clientY;
    dragState.pendingPointerTarget = event.currentTarget;
    dragState.lastPointer = { x: touch.clientX, y: touch.clientY };

    dragState.pendingPointerTimer = window.setTimeout(() => {
        if (!dragState.pendingPointerTarget) return;
        beginPointerDrag(dragState.pendingPointerTarget);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    }, POINTER_DRAG_DELAY_MS);

    document.addEventListener('touchmove', handleTouchMoveGuard, { passive: false });
    document.addEventListener('touchend', handleTouchEndGuard, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancelGuard, { passive: true });
}

function handleTouchMoveGuard(event) {
    if (!dragState.pendingPointerTimer) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    dragState.lastPointer = { x: touch.clientX, y: touch.clientY };
    const dx = touch.clientX - dragState.pointerStartX;
    const dy = touch.clientY - dragState.pointerStartY;
    if (Math.hypot(dx, dy) > POINTER_DRAG_THRESHOLD_PX) {
        clearPendingPointerDrag();
        removeTouchGuards();
    }
}

function handleTouchEndGuard() {
    if (!dragState.pendingPointerTimer) return;
    clearPendingPointerDrag();
    removeTouchGuards();
}

function handleTouchCancelGuard() {
    if (!dragState.pendingPointerTimer) return;
    clearPendingPointerDrag();
    removeTouchGuards();
}

function removeTouchGuards() {
    document.removeEventListener('touchmove', handleTouchMoveGuard);
    document.removeEventListener('touchend', handleTouchEndGuard);
    document.removeEventListener('touchcancel', handleTouchCancelGuard);
}

function handleTouchMove(event) {
    if (!dragState.isPointerDrag || !dragState.draggingEl) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    dragState.lastPointer = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
    performReorderFromPoint(touch.clientX, touch.clientY);
    updateAutoScroll(touch.clientY);
}

function handleTouchEnd() {
    if (dragState.isPointerDrag) {
        finishPointerDrag();
    }
    removeTouchDragListeners();
}

function handleTouchCancel() {
    if (dragState.isPointerDrag) {
        cancelDrag();
    }
    removeTouchDragListeners();
}

function removeTouchDragListeners() {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchCancel);
}

function handlePointerDown(event) {
    if (isReadOnly) return;
    if (event.pointerType === 'mouse') return;
    if (event.pointerType === 'touch') return;
    if (isInteractiveTarget(event.target)) return;
    if (event.currentTarget?.dataset?.dragDisabled === 'true') return;
    if (editingCardId) {
        window.cancelCard(editingCardId);
    }

    dragState.pointerId = event.pointerId;
    dragState.pointerStartX = event.clientX;
    dragState.pointerStartY = event.clientY;
    dragState.pendingPointerTarget = event.currentTarget;
    dragState.lastPointer = { x: event.clientX, y: event.clientY };
    dragState.pointerCaptureTarget = event.currentTarget;
    if (dragState.pointerCaptureTarget.setPointerCapture) {
        dragState.pointerCaptureTarget.setPointerCapture(event.pointerId);
    }

    dragState.pendingPointerTimer = window.setTimeout(() => {
        if (!dragState.pendingPointerTarget) return;
        beginPointerDrag(dragState.pendingPointerTarget);
    }, POINTER_DRAG_DELAY_MS);

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('pointercancel', handlePointerCancel, { passive: true });
}

function beginPointerDrag(target) {
    dragState.pendingPointerTimer = null;
    dragState.pendingPointerTarget = null;
    dragState.draggingEl = target;
    dragState.startOrder = getCurrentOrderIds();
    dragState.didCancel = false;
    dragState.isPointerDrag = true;
    dragState.draggingEl.classList.add('dragging');
    cardsContainer.classList.add('drag-active');
}

function handlePointerMove(event) {
    if (event.pointerId !== dragState.pointerId) return;
    dragState.lastPointer = { x: event.clientX, y: event.clientY };

    if (dragState.pendingPointerTimer) {
        const dx = event.clientX - dragState.pointerStartX;
        const dy = event.clientY - dragState.pointerStartY;
        if (Math.hypot(dx, dy) > POINTER_DRAG_THRESHOLD_PX) {
            clearPendingPointerDrag();
        }
        return;
    }

    if (!dragState.isPointerDrag || !dragState.draggingEl) return;
    event.preventDefault();
    performReorderFromPoint(event.clientX, event.clientY);
    updateAutoScroll(event.clientY);
}

function handlePointerUp(event) {
    if (event.pointerId !== dragState.pointerId) return;
    if (dragState.pendingPointerTimer) {
        clearPendingPointerDrag();
        return;
    }
    if (dragState.isPointerDrag) {
        finishPointerDrag();
    }
    clearPointerListeners();
}

function handlePointerCancel(event) {
    if (event.pointerId !== dragState.pointerId) return;
    if (dragState.pendingPointerTimer) {
        clearPendingPointerDrag();
        return;
    }
    if (dragState.isPointerDrag) {
        cancelDrag();
    }
    clearPointerListeners();
}

function clearPendingPointerDrag() {
    if (dragState.pendingPointerTimer) {
        clearTimeout(dragState.pendingPointerTimer);
    }
    dragState.pendingPointerTimer = null;
    dragState.pendingPointerTarget = null;
    dragState.lastPointer = null;
    removeTouchGuards();
    clearPointerListeners();
}

function clearPointerListeners() {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.removeEventListener('pointercancel', handlePointerCancel);
    if (dragState.pointerCaptureTarget?.releasePointerCapture && dragState.pointerId !== null) {
        dragState.pointerCaptureTarget.releasePointerCapture(dragState.pointerId);
    }
    dragState.pointerId = null;
    dragState.pointerCaptureTarget = null;
}

function finishPointerDrag() {
    if (!dragState.draggingEl) return;
    dragState.draggingEl.classList.remove('dragging');
    cardsContainer.classList.remove('drag-active');
    stopAutoScroll();

    const endOrder = getCurrentOrderIds();
    const orderChanged = !dragState.didCancel &&
        endOrder.length === dragState.startOrder.length &&
        endOrder.some((id, idx) => id !== dragState.startOrder[idx]);

    dragState.draggingEl = null;
    dragState.startOrder = [];
    dragState.didCancel = false;
    dragState.isPointerDrag = false;
    removeTouchDragListeners();

    if (orderChanged) {
        persistOrderFromDom();
    }
}

function performReorderFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    const targetCard = target ? target.closest('.card') : null;
    if (!targetCard || targetCard === dragState.draggingEl) return;

    const rect = targetCard.getBoundingClientRect();
    const shouldInsertAfter = (clientY - rect.top) > rect.height / 2;
    const referenceNode = shouldInsertAfter ? targetCard.nextSibling : targetCard;
    if (referenceNode !== dragState.draggingEl) {
        cardsContainer.insertBefore(dragState.draggingEl, referenceNode);
    }
}

function updateAutoScroll(clientY) {
    if (!dragState.draggingEl) return;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    let velocity = 0;
    if (clientY < AUTO_SCROLL_MARGIN_PX) {
        velocity = -Math.min(
            AUTO_SCROLL_MAX_SPEED,
            Math.ceil((AUTO_SCROLL_MARGIN_PX - clientY) / AUTO_SCROLL_STEP_DIVISOR)
        );
    } else if (clientY > viewportHeight - AUTO_SCROLL_MARGIN_PX) {
        velocity = Math.min(
            AUTO_SCROLL_MAX_SPEED,
            Math.ceil((clientY - (viewportHeight - AUTO_SCROLL_MARGIN_PX)) / AUTO_SCROLL_STEP_DIVISOR)
        );
    }

    if (velocity === dragState.autoScrollVelocity) return;
    dragState.autoScrollVelocity = velocity;
    if (velocity === 0) {
        stopAutoScroll();
        return;
    }
    if (!dragState.autoScrollRaf) {
        dragState.autoScrollRaf = requestAnimationFrame(runAutoScroll);
    }
}

function runAutoScroll() {
    if (!dragState.autoScrollVelocity) {
        dragState.autoScrollRaf = null;
        return;
    }
    window.scrollBy(0, dragState.autoScrollVelocity);
    if (dragState.lastPointer) {
        performReorderFromPoint(dragState.lastPointer.x, dragState.lastPointer.y);
    }
    dragState.autoScrollRaf = requestAnimationFrame(runAutoScroll);
}

function stopAutoScroll() {
    dragState.autoScrollVelocity = 0;
    if (dragState.autoScrollRaf) {
        cancelAnimationFrame(dragState.autoScrollRaf);
        dragState.autoScrollRaf = null;
    }
}

function cancelDrag() {
    if (!dragState.draggingEl) return;
    dragState.didCancel = true;
    restoreOrder(dragState.startOrder);
    dragState.draggingEl.classList.remove('dragging');
    cardsContainer.classList.remove('drag-active');
    stopAutoScroll();
    removeTouchDragListeners();
    removeTouchGuards();
    if (dragState.handleKeyDown) {
        document.removeEventListener('keydown', dragState.handleKeyDown);
        dragState.handleKeyDown = null;
    }
    dragState.draggingEl = null;
    dragState.startOrder = [];
    dragState.isPointerDrag = false;
}

function getCurrentOrderIds() {
    return Array.from(cardsContainer.querySelectorAll('.card'))
        .map((card) => card.getAttribute('data-card-id'))
        .filter(Boolean);
}

function restoreOrder(orderIds) {
    if (!orderIds || orderIds.length === 0) return;
    const byId = new Map();
    cardsContainer.querySelectorAll('.card').forEach((card) => {
        byId.set(card.getAttribute('data-card-id'), card);
    });

    orderIds.forEach((cardId) => {
        const cardEl = byId.get(cardId);
        if (cardEl) {
            cardsContainer.appendChild(cardEl);
        }
    });
}

async function persistOrderFromDom() {
    if (!cardService || !currentCards || currentCards.length === 0) return;

    const orderedIds = getCurrentOrderIds();

    if (sortSelect) {
        sortSelect.value = 'custom';
    }

    try {
        await applyRankUpdates(buildRankUpdatesForOrder(orderedIds));
    } catch (error) {
        console.error('Error updating card order:', error);
        alert('Failed to update card order. Please try again.');
    }
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
    const tagIds = getCardTagIds(card);
    const tags = getCardTags(card);

    // Store original content
    editingCardId = cardId;
    originalTitle = titleEl.textContent;
    originalDescription = descEl.innerText;
    const originalTagIds = [...tagIds];
    const originalTags = tags.map(tag => ({ ...tag }));

    card.draggable = false;
    card.dataset.dragDisabled = 'true';
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
        if (card.dataset.suppressClickAway === 'true') {
            return;
        }
        if (!card.contains(e.target)) {
            window.cancelCard(cardId);
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickAway);

    enableTagEditing(card, tags);

    // Store handlers for cleanup
    editHandlers[cardId] = { handleKeyDown, handleClickAway, originalTagIds, originalTags };
}

window.saveCard = async function (cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card || !cardService) return;

    const titleEl = card.querySelector('[data-field="title"]');
    const descEl = card.querySelector('[data-field="description"]');

    await commitPendingInput(card);

    const newTitle = titleEl.textContent.trim();
    const newDescription = descEl.innerText.trim();
    const newTagIds = getCardTagIds(card);
    const newTags = getCardTags(card);

    try {
        await cardService.updateCard(cardId, {
            title: newTitle,
            description: newDescription,
            tagIds: Array.isArray(newTagIds) ? newTagIds : [],
            tags: Array.isArray(newTags) ? newTags : []
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

    if (editHandlers[cardId]?.originalTagIds) {
        setCardTagIds(card, editHandlers[cardId].originalTagIds);
    }
    if (editHandlers[cardId]?.originalTags) {
        setCardTags(card, editHandlers[cardId].originalTags);
        renderCardTagsWithFallbackWrapper(card, editHandlers[cardId].originalTags, false);
    }

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
    if (!isReadOnly) {
        card.draggable = supportsNativeDrag();
        card.dataset.dragDisabled = 'false';
    }

    if (btn) {
        btn.textContent = 'Edit';
        btn.onclick = () => window.editCard(cardId);
        btn.className = 'edit-btn';
    }

    disableTagEditing(card);

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

function getCardTagIds(cardEl) {
    if (!cardEl || !cardEl.dataset.tagIds) return [];
    try {
        const parsed = JSON.parse(cardEl.dataset.tagIds);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function setCardTagIds(cardEl, tagIds) {
    const nextTagIds = Array.isArray(tagIds) ? tagIds : [];
    cardEl.dataset.tagIds = JSON.stringify(nextTagIds);
}

function getCardTags(cardEl) {
    if (!cardEl || !cardEl.dataset.tags) return [];
    try {
        const parsed = JSON.parse(cardEl.dataset.tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function setCardTags(cardEl, tags) {
    const nextTags = Array.isArray(tags) ? tags : [];
    const normalized = nextTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        nameLower: tag.nameLower || (tag.name ? tag.name.toLowerCase() : ''),
        color: tag.color
    })).filter((tag) => tag.id && tag.name);
    cardEl.dataset.tags = JSON.stringify(normalized);
}

function renderCardTagsWithFallbackWrapper(cardEl, tags, editable) {
    const fallbackTags = getCardTagIds(cardEl)
        .map((tagId) => tagMap.get(tagId))
        .filter(Boolean);
    renderCardTagsWithFallback(cardEl, tags, fallbackTags, editable);
}

function enableTagEditing(cardEl, tags) {
    enableTagEditingView(cardEl, {
        getSelectedTags: () => getCardTags(cardEl),
        setSelectedTags: (next) => setCardTags(cardEl, next),
        getSelectedTagIds: () => getCardTagIds(cardEl),
        setSelectedTagIds: (next) => setCardTagIds(cardEl, next),
        getFallbackTags: () => getCardTagIds(cardEl).map((tagId) => tagMap.get(tagId)).filter(Boolean),
        getSuggestions: (query, excludeIds) => getTagSuggestions(query, excludeIds, tagMap),
        onCreateTag: (raw) => getOrCreateTag(raw)
    });
    cardEl.dataset.tagEditorActive = 'true';
}

function disableTagEditing(cardEl) {
    const tags = getCardTags(cardEl);
    disableTagEditingView(cardEl, tags);
    cardEl.dataset.tagEditorActive = 'false';
}

async function getOrCreateTag(rawName) {
    if (!tagService) return null;
    const name = normalizeTagName(rawName);
    if (!name) return null;
    const nameLower = name.toLowerCase();
    const existing = tagNameMap.get(nameLower) || getTagByNameLower(nameLower);
    if (existing) {
        return existing;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    const color = pickRandomTagColor();
    try {
        const newTagId = await tagService.createTag(currentUser.uid, {
            name,
            nameLower,
            color
        });
        return {
            id: newTagId,
            name,
            nameLower,
            color
        };
    } catch (error) {
        console.error('Error creating tag:', error);
        alert('Failed to create tag. Please try again.');
        return null;
    }
}

function refreshAllCardTags() {
    if (!cardsContainer) return;
    cardsContainer.querySelectorAll('.card').forEach((cardEl) => {
        const tags = getCardTags(cardEl);
        const editable = cardEl.dataset.tagEditorActive === 'true';
        renderCardTagsWithFallbackWrapper(cardEl, tags, editable);
        if (editable) {
            enableTagEditing(cardEl, tags);
        }
        maybeBackfillCardTags(cardEl);
    });
}

function updateTagFilterOptions(cards) {
    if (!tagFilterPanel || !tagFilterList || !tagFilterEmpty) return;
    const availableTags = buildAvailableTagOptions(cards, tagMap);
    renderTagFilterOptions(availableTags);
}

function renderTagFilterOptions(tags) {
    const hasTags = tags.length > 0;
    tagFilterList.innerHTML = '';
    tagFilterEmpty.style.display = hasTags ? 'none' : 'block';
    tagFilterList.style.display = hasTags ? 'flex' : 'none';

    if (selectedTagFilterId && !tags.some(tag => tag.id === selectedTagFilterId)) {
        selectedTagFilterId = null;
    }

    tags.forEach((tag) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tag-filter-option';
        button.dataset.tagFilterId = tag.id;
        button.style.background = tag.color || '#ecf0f1';
        button.style.color = getReadableTextColor(tag.color);
        button.textContent = tag.name;
        if (tag.id === selectedTagFilterId) {
            button.classList.add('is-selected');
        }
        button.addEventListener('click', () => {
            const next = tag.id === selectedTagFilterId ? null : tag.id;
            setActiveTagFilter(next);
            setFilterPanelOpen(false);
        });
        tagFilterList.appendChild(button);
    });

    updateClearButtonState();
    updateActiveFilterLabel();
    applyTagFilterToCards();
}

function setFilterPanelOpen(isOpen) {
    isFilterPanelOpen = Boolean(isOpen);
    if (tagFilterPanel) {
        tagFilterPanel.classList.toggle('is-collapsed', !isFilterPanelOpen);
    }
    if (tagFilterToggleBtn) {
        tagFilterToggleBtn.setAttribute('aria-expanded', String(isFilterPanelOpen));
    }
}

function setActiveTagFilter(tagId) {
    selectedTagFilterId = tagId;
    if (tagFilterList) {
        tagFilterList.querySelectorAll('.tag-filter-option').forEach((option) => {
            option.classList.toggle('is-selected', option.dataset.tagFilterId === tagId);
        });
    }
    updateActiveFilterLabel();
    updateClearButtonState();
    applyTagFilterToCards();
}

function updateClearButtonState() {
    if (!clearTagFilterBtn) return;
    clearTagFilterBtn.disabled = !selectedTagFilterId;
}

function updateActiveFilterLabel() {
    if (!tagFilterPanel || !tagFilterActiveLabel) return;
    if (!selectedTagFilterId) {
        tagFilterPanel.classList.remove('has-active-filter');
        tagFilterActiveLabel.textContent = '';
        return;
    }
    const tagName = getTagNameById(selectedTagFilterId);
    tagFilterPanel.classList.add('has-active-filter');
    tagFilterActiveLabel.textContent = tagName ? tagName : 'Filtered';
}

function getTagNameById(tagId) {
    if (!tagId) return '';
    const fromStore = tagMap.get(tagId);
    if (fromStore && fromStore.name) return fromStore.name;
    const option = tagFilterList?.querySelector(`[data-tag-filter-id="${tagId}"]`);
    if (option) return option.textContent || '';
    return '';
}

function applyTagFilterToCards() {
    if (!cardsContainer) return;
    const activeId = selectedTagFilterId;
    cardsContainer.querySelectorAll('.card').forEach((cardEl) => {
        const matches = !activeId || cardMatchesTagFilterDom(cardEl, activeId);
        cardEl.classList.toggle('is-filtered-out', !matches);
    });
}

function cardMatchesTagFilterDom(cardEl, tagId) {
    return cardMatchesTagFilter(getCardTagIds(cardEl), getCardTags(cardEl), tagId);
}

function maybeBackfillCardTags(cardEl) {
    if (!cardService) return;
    backfillCardTags(cardEl, {
        getCardTags: () => getCardTags(cardEl),
        setCardTags: (next) => setCardTags(cardEl, next),
        getCardTagIds: () => getCardTagIds(cardEl),
        setCardTagIds: (next) => setCardTagIds(cardEl, next),
        getFallbackTags: (tagIds) => tagIds.map((tagId) => tagMap.get(tagId)).filter(Boolean),
        onPersist: (tags, tagIds) => {
            const cardId = cardEl.getAttribute('data-card-id');
            if (!cardId) return;
            cardService.updateCard(cardId, { tags, tagIds }).catch((error) => {
                console.error('Failed to backfill tags for card:', error);
            });
        }
    });
}

async function applyRankUpdates(updates) {
    if (!updates || Object.keys(updates).length === 0) return;
    await cardService.updateCardRanks(updates);
}
