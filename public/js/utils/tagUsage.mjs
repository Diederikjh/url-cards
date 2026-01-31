export function computeTagUsageCounts(cards) {
    const counts = new Map();
    const list = Array.isArray(cards) ? cards : [];

    list.forEach((card) => {
        const tagIds = Array.isArray(card.tagIds) ? card.tagIds : [];
        if (tagIds.length > 0) {
            tagIds.forEach((tagId) => {
                if (!tagId) return;
                counts.set(tagId, (counts.get(tagId) || 0) + 1);
            });
            return;
        }

        const tags = Array.isArray(card.tags) ? card.tags : [];
        tags.forEach((tag) => {
            if (!tag || !tag.id) return;
            counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
        });
    });

    return counts;
}
