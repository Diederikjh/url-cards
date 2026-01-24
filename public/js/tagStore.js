let tagService = null;
let tags = [];
let tagsById = new Map();
let tagsByNameLower = new Map();
let tagsUnsubscribe = null;
const subscribers = new Set();

function buildIndexes(nextTags) {
    const byId = new Map();
    const byNameLower = new Map();

    nextTags.forEach((tag) => {
        byId.set(tag.id, tag);
        if (tag.nameLower) {
            byNameLower.set(tag.nameLower, tag);
        }
    });

    return { byId, byNameLower };
}

function notify() {
    const snapshot = getTagsSnapshot();
    subscribers.forEach((callback) => callback(snapshot));
}

export function initTagStore(service) {
    tagService = service;
}

export function startTagStore(userId) {
    if (!tagService || !userId) return;
    if (tagsUnsubscribe) {
        tagsUnsubscribe();
    }

    tagsUnsubscribe = tagService.watchTags(userId, (nextTags) => {
        tags = nextTags || [];
        const indexes = buildIndexes(tags);
        tagsById = indexes.byId;
        tagsByNameLower = indexes.byNameLower;
        notify();
    });
}

export function stopTagStore() {
    if (tagsUnsubscribe) {
        tagsUnsubscribe();
        tagsUnsubscribe = null;
    }
    tags = [];
    tagsById = new Map();
    tagsByNameLower = new Map();
    notify();
}

export function getTagsSnapshot() {
    return {
        tags: [...tags],
        tagsById: new Map(tagsById),
        tagsByNameLower: new Map(tagsByNameLower)
    };
}

export function getTagById(tagId) {
    return tagsById.get(tagId) || null;
}

export function getTagByNameLower(nameLower) {
    return tagsByNameLower.get(nameLower) || null;
}

export function onTagsUpdated(callback) {
    if (typeof callback !== 'function') return () => {};
    subscribers.add(callback);
    callback(getTagsSnapshot());
    return () => {
        subscribers.delete(callback);
    };
}
