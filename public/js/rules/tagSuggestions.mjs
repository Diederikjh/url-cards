export function getTagSuggestions(query, excludeIds, tagsById, limit = 6) {
    const normalizedQuery = (query || '').trim().toLowerCase();
    if (!normalizedQuery || !tagsById || typeof tagsById.forEach !== 'function') return [];

    const excluded = Array.isArray(excludeIds) ? new Set(excludeIds) : new Set();
    const matches = [];

    tagsById.forEach((tag, tagId) => {
        if (matches.length >= limit) return;
        if (excluded.has(tagId)) return;
        const nameLower = tag?.nameLower || (tag?.name ? tag.name.toLowerCase() : '');
        if (nameLower.startsWith(normalizedQuery)) {
            matches.push(tag);
        }
    });

    return matches;
}
