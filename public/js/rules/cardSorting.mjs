export function compareCards(a, b, sortType) {
    switch (sortType) {
        case 'created_desc':
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        case 'created_asc':
            return a.createdAt.toMillis() - b.createdAt.toMillis();
        case 'name_asc':
            return (a.title || '').localeCompare(b.title || '');
        case 'name_desc':
            return (b.title || '').localeCompare(a.title || '');
        default:
            return 0;
    }
}

export function rankForSort(card, index, sortType) {
    if (sortType === 'created_desc') {
        return -card.createdAt.toMillis();
    }
    if (sortType === 'created_asc') {
        return card.createdAt.toMillis();
    }
    return index * 1000;
}

export function buildRankUpdatesForSort(cards, sortType) {
    const updates = {};
    cards.forEach((card, index) => {
        updates[card.id] = rankForSort(card, index, sortType);
    });
    return updates;
}

export function buildRankUpdatesForOrder(orderedIds) {
    const updates = {};
    orderedIds.forEach((cardId, index) => {
        updates[cardId] = index * 1000;
    });
    return updates;
}
