export function buildAvailableTagOptions(cards, tagMap) {
    const byId = new Map();
    const list = Array.isArray(cards) ? cards : [];

    list.forEach((card) => {
        const cardTags = Array.isArray(card.tags) ? card.tags : [];
        cardTags.forEach((tag) => {
            if (!tag || !tag.id || !tag.name) return;
            if (!byId.has(tag.id)) {
                byId.set(tag.id, {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color || '#ecf0f1'
                });
            }
        });

        const cardTagIds = Array.isArray(card.tagIds) ? card.tagIds : [];
        cardTagIds.forEach((tagId) => {
            if (!tagId || !tagMap || typeof tagMap.get !== 'function') return;
            const fromStore = tagMap.get(tagId);
            if (!fromStore || !fromStore.id || !fromStore.name) return;
            if (!byId.has(tagId)) {
                byId.set(tagId, {
                    id: fromStore.id,
                    name: fromStore.name,
                    color: fromStore.color || '#ecf0f1'
                });
            }
        });
    });

    const options = Array.from(byId.values());
    options.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
    return options;
}

export function cardMatchesTagFilter(tagIds, tags, activeId) {
    if (!activeId) return true;
    const safeTagIds = Array.isArray(tagIds) ? tagIds : [];
    if (safeTagIds.includes(activeId)) return true;
    const safeTags = Array.isArray(tags) ? tags : [];
    return safeTags.some((tag) => tag && tag.id === activeId);
}
