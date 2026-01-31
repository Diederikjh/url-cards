export function normalizeTagName(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim();
}

export function isTagNameValid(name, minLen = 2, maxLen = 40) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length < minLen || trimmed.length > maxLen) return false;
    return true;
}

export function isTagNameDuplicate(nameLower, existingTags, excludeId = null) {
    if (!nameLower) return false;
    const tags = Array.isArray(existingTags) ? existingTags : [];
    return tags.some(tag => tag && tag.nameLower === nameLower && tag.id !== excludeId);
}
