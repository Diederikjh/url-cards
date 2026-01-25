import { getReadableTextColor } from './tagPalette.js';

export function renderCardTags(cardEl, tags, editable, fallbackTags = []) {
    const container = cardEl.querySelector('[data-card-tags]');
    if (!container) return;
    let safeTags = Array.isArray(tags) ? tags : [];
    if (safeTags.length === 0 && Array.isArray(fallbackTags) && fallbackTags.length > 0) {
        safeTags = fallbackTags;
    }

    const chipsHtml = safeTags.map((tag) => {
        if (!tag || !tag.name) return '';
        const textColor = getReadableTextColor(tag.color);
        const removeBtn = editable ? `<button class="tag-remove-btn" data-tag-remove="${tag.id}" aria-label="Remove tag">x</button>` : '';
        return `
            <span class="tag-chip" style="background:${tag.color}; color:${textColor};" data-tag-id="${tag.id}">
                ${tag.name}
                ${removeBtn}
            </span>
        `;
    }).join('');

    const inputHtml = editable ? `
        <div class="tag-input-row">
            <input type="text" class="tag-input" placeholder="Add tag..." data-tag-input />
            <div class="tag-suggestions" data-tag-suggestions></div>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="tag-chips">${chipsHtml || (editable ? '' : '<span class="tag-placeholder">No tags</span>')}</div>
        ${inputHtml}
    `;
}

export function enableTagEditing(cardEl, options) {
    const {
        getSelectedTags,
        setSelectedTags,
        getSelectedTagIds,
        setSelectedTagIds,
        getSuggestions,
        onCreateTag,
        getFallbackTags
    } = options;

    const getEffectiveTags = () => {
        const selected = getSelectedTags();
        if (selected.length > 0) return selected;
        if (typeof getFallbackTags === 'function') {
            return getFallbackTags();
        }
        return selected;
    };

    const getEffectiveTagIds = () => {
        const selectedIds = getSelectedTagIds();
        if (selectedIds.length > 0) return selectedIds;
        const fallbackTags = getEffectiveTags();
        return fallbackTags.map((tag) => tag.id).filter(Boolean);
    };

    renderCardTags(cardEl, getEffectiveTags(), true);
    const input = cardEl.querySelector('[data-tag-input]');
    const suggestions = cardEl.querySelector('[data-tag-suggestions]');
    const removeButtons = cardEl.querySelectorAll('[data-tag-remove]');

    const handleRemove = (e) => {
        e.stopPropagation();
        const tagId = e.currentTarget.getAttribute('data-tag-remove');
        const nextTags = getEffectiveTags().filter(tag => tag.id !== tagId);
        const nextTagIds = nextTags.map(tag => tag.id);
        setSelectedTags(nextTags);
        setSelectedTagIds(nextTagIds);
        renderCardTags(cardEl, nextTags, true);
        enableTagEditing(cardEl, options);
    };

    removeButtons.forEach(btn => {
        btn.addEventListener('click', handleRemove);
    });

    const handleInputKeydown = async (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const raw = input.value.trim();
            if (raw.length < 2 || raw.length > 40) {
                alert('Tags should be 2-40 characters long.');
                return;
            }
            const tag = await onCreateTag(raw);
            if (tag) {
                const nextTags = Array.from(new Map([...getSelectedTags(), tag].map(item => [item.id, item])).values());
                const nextTagIds = nextTags.map(item => item.id);
                setSelectedTags(nextTags);
                setSelectedTagIds(nextTagIds);
                renderCardTags(cardEl, nextTags, true);
                enableTagEditing(cardEl, options);
                input.value = '';
                updateSuggestions(input, suggestions, getSuggestions, nextTagIds, (tag) => {
                    const currentTags = getEffectiveTags();
                    const next = Array.from(new Map([...currentTags, tag].map(item => [item.id, item])).values());
                    const nextIds = next.map(item => item.id);
                    setSelectedTags(next);
                    setSelectedTagIds(nextIds);
                    renderCardTags(cardEl, next, true);
                    enableTagEditing(cardEl, options);
                });
            }
        } else if (e.key === 'Escape') {
            input.blur();
        }
    };

    const handleInput = () => {
        updateSuggestions(input, suggestions, getSuggestions, getEffectiveTagIds(), (tag) => {
            const currentTags = getEffectiveTags();
            const next = Array.from(new Map([...currentTags, tag].map(item => [item.id, item])).values());
            const nextIds = next.map(item => item.id);
            setSelectedTags(next);
            setSelectedTagIds(nextIds);
            renderCardTags(cardEl, next, true);
            enableTagEditing(cardEl, options);
        });
    };

    if (input) {
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('keydown', handleInputKeydown);
        input.addEventListener('input', handleInput);
        updateSuggestions(input, suggestions, getSuggestions, getEffectiveTagIds(), (tag) => {
            const currentTags = getEffectiveTags();
            const next = Array.from(new Map([...currentTags, tag].map(item => [item.id, item])).values());
            const nextIds = next.map(item => item.id);
            setSelectedTags(next);
            setSelectedTagIds(nextIds);
            renderCardTags(cardEl, next, true);
            enableTagEditing(cardEl, options);
        });
    }
}

export function disableTagEditing(cardEl, tags) {
    renderCardTags(cardEl, tags, false);
}

export function renderCardTagsWithFallback(cardEl, tags, fallbackTags, editable) {
    renderCardTags(cardEl, tags, editable, fallbackTags);
}

export function backfillCardTags(cardEl, options) {
    const {
        getCardTags,
        setCardTags,
        getCardTagIds,
        setCardTagIds,
        getFallbackTags,
        onPersist
    } = options;

    if (!cardEl || cardEl.dataset.tagsBackfilled === 'true') return;
    const tagIds = getCardTagIds();
    const tags = getCardTags();
    let nextTags = tags;
    let nextTagIds = tagIds;

    if (tags.length === 0 && tagIds.length > 0) {
        const derived = getFallbackTags(tagIds);
        if (derived.length !== tagIds.length) return;
        nextTags = derived;
        setCardTags(nextTags);
    }

    if (tagIds.length === 0 && tags.length > 0) {
        nextTagIds = tags.map((tag) => tag.id).filter(Boolean);
        setCardTagIds(nextTagIds);
    }

    if (nextTags.length === 0 && nextTagIds.length === 0) return;

    cardEl.dataset.tagsBackfilled = 'true';
    onPersist(nextTags, nextTagIds);
}

function updateSuggestions(input, suggestionsEl, getSuggestions, selectedTagIds, onSelect) {
    if (!suggestionsEl) return;
    const query = input.value.trim().toLowerCase();
    if (!query) {
        suggestionsEl.innerHTML = '';
        return;
    }

    const matches = getSuggestions(query, selectedTagIds).slice(0, 6);

    if (matches.length === 0) {
        suggestionsEl.innerHTML = '';
        return;
    }

    suggestionsEl.innerHTML = matches.map(tag => {
        const textColor = getReadableTextColor(tag.color);
        return `
            <button class="tag-suggestion" data-tag-suggestion="${tag.id}" style="background:${tag.color}; color:${textColor};">
                ${tag.name}
            </button>
        `;
    }).join('');

    suggestionsEl.querySelectorAll('[data-tag-suggestion]').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagId = btn.getAttribute('data-tag-suggestion');
            const matchesTag = matches.find(tag => tag.id === tagId);
            if (!matchesTag) return;
            onSelect(matchesTag);
        });
    });
}
