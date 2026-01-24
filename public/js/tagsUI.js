// Tags management UI module
import { getCurrentUser } from './auth.js';
import { onTagsUpdated, getTagsSnapshot } from './tagStore.js';
import { pickRandomTagColor } from './tagPalette.js';

let tagService = null;

let tagsView;
let tagsList;
let tagSearchInput;
let createTagBtn;
let tagsEmptyState;

let tagsSubscription = null;

export function initTagsUI(service) {
    tagService = service;

    tagsView = document.getElementById('tagsView');
    tagsList = document.getElementById('tagsList');
    tagSearchInput = document.getElementById('tagSearchInput');
    createTagBtn = document.getElementById('createTagBtn');
    tagsEmptyState = document.getElementById('tagsEmptyState');

    if (!tagsView) return;

    if (tagSearchInput) {
        tagSearchInput.addEventListener('input', handleSearch);
    }
    if (createTagBtn) {
        createTagBtn.addEventListener('click', handleCreateTag);
    }

    if (tagsSubscription) {
        tagsSubscription();
    }
    tagsSubscription = onTagsUpdated(() => {
        if (!tagSearchInput || !tagSearchInput.value.trim()) {
            renderTagsList(getTagsSnapshot().tags);
        }
    });
}

export function showTagsView() {
    if (!tagsView) return;
    renderTagsList(getTagsSnapshot().tags);
}

async function handleCreateTag() {
    const currentUser = getCurrentUser();
    if (!currentUser || !tagService) return;

    const name = prompt('Enter tag name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 40) {
        alert('Tags should be 2-40 characters long.');
        return;
    }

    const nameLower = trimmed.toLowerCase();
    const existing = getTagsSnapshot().tags.find(tag => tag.nameLower === nameLower);
    if (existing) {
        alert('That tag already exists.');
        return;
    }

    try {
        await tagService.createTag(currentUser.uid, {
            name: trimmed,
            nameLower,
            color: pickRandomTagColor()
        });
    } catch (error) {
        console.error('Error creating tag:', error);
        alert('Failed to create tag. Please try again.');
    }
}

async function handleSearch() {
    const currentUser = getCurrentUser();
    if (!currentUser || !tagService) return;

    const query = tagSearchInput.value.trim();
    if (!query) {
        renderTagsList(getTagsSnapshot().tags);
        return;
    }

    try {
        const results = await tagService.searchTagsByPrefix(currentUser.uid, query);
        renderTagsList(results);
    } catch (error) {
        console.error('Error searching tags:', error);
        renderTagsList(getTagsSnapshot().tags.filter(tag => tag.nameLower.startsWith(query.toLowerCase())));
    }
}

function renderTagsList(tags) {
    if (!tagsList) return;
    const sorted = [...tags].sort((a, b) => (a.nameLower || '').localeCompare(b.nameLower || ''));

    if (sorted.length === 0) {
        tagsList.innerHTML = '';
        if (tagsEmptyState) {
            tagsEmptyState.style.display = 'block';
        }
        return;
    }

    if (tagsEmptyState) {
        tagsEmptyState.style.display = 'none';
    }

    tagsList.innerHTML = '';
    sorted.forEach((tag) => {
        const row = document.createElement('div');
        row.className = 'tag-row';
        row.dataset.tagId = tag.id;
        row.innerHTML = `
            <div class="tag-preview" style="background:${tag.color}; color:${getTextColor(tag.color)};">${tag.name}</div>
            <input class="tag-name-input" type="text" value="${tag.name}" />
            <input class="tag-color-input" type="color" value="${tag.color}" />
            <button class="tag-save-btn">Save</button>
            <button class="tag-delete-btn">Delete</button>
        `;

        const nameInput = row.querySelector('.tag-name-input');
        const colorInput = row.querySelector('.tag-color-input');
        const saveBtn = row.querySelector('.tag-save-btn');
        const deleteBtn = row.querySelector('.tag-delete-btn');

        const handleSave = async () => {
            const nextName = nameInput.value.trim();
            if (nextName.length < 2 || nextName.length > 40) {
                alert('Tags should be 2-40 characters long.');
                nameInput.value = tag.name;
                return;
            }
            const nameLower = nextName.toLowerCase();
            const existing = getTagsSnapshot().tags.find(existingTag => existingTag.nameLower === nameLower && existingTag.id !== tag.id);
            if (existing) {
                alert('That tag already exists.');
                nameInput.value = tag.name;
                return;
            }

            try {
                await tagService.updateTag(tag.id, {
                    name: nextName,
                    nameLower
                });
            } catch (error) {
                console.error('Error updating tag:', error);
                alert('Failed to update tag. Please try again.');
                nameInput.value = tag.name;
            }
        };

        saveBtn.addEventListener('click', handleSave);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });

        colorInput.addEventListener('change', async () => {
            try {
                await tagService.updateTag(tag.id, {
                    color: colorInput.value
                });
                row.querySelector('.tag-preview').style.background = colorInput.value;
                row.querySelector('.tag-preview').style.color = getTextColor(colorInput.value);
            } catch (error) {
                console.error('Error updating tag color:', error);
                alert('Failed to update tag color. Please try again.');
                colorInput.value = tag.color;
            }
        });

        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Delete this tag? It will be removed from all cards.')) return;
            try {
                await tagService.deleteTag(tag.id, tag.userId);
            } catch (error) {
                console.error('Error deleting tag:', error);
                alert('Failed to delete tag. Please try again.');
            }
        });

        tagsList.appendChild(row);
    });
}

function getTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '#1f2933';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#1f2933';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.6 ? '#1f2933' : '#f9fafb';
}
