/**
 * Card model - represents a card data object
 * This is a data-only class with no business logic
 */
export class Card {
    constructor(id, userId, boardId, url, title, description, imageUrl, createdAt, rank, tagIds = [], tags = []) {
        this.id = id;
        this.userId = userId;
        this.boardId = boardId;
        this.url = url;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
        this.rank = rank;
        this.tagIds = tagIds;
        this.tags = tags;
    }

    /**
     * Create a Card from Firestore document data
     * @param {string} id - Document ID
     * @param {Object} data - Firestore document data
     * @returns {Card}
     */
    static fromFirestore(id, data) {
        return new Card(
            id,
            data.userId,
            data.boardId,
            data.url,
            data.title,
            data.description,
            data.imageUrl || null,
            data.createdAt,
            data.rank !== undefined ? data.rank : 0,
            Array.isArray(data.tagIds) ? data.tagIds : [],
            Array.isArray(data.tags) ? data.tags : []
        );
    }

    /**
     * Convert Card to plain object for Firestore
     * @returns {Object} Data suitable for Firestore
     */
    toFirestore() {
        const data = {
            userId: this.userId,
            boardId: this.boardId,
            url: this.url,
            title: this.title,
            description: this.description,
            createdAt: this.createdAt,
            rank: this.rank,
            tagIds: Array.isArray(this.tagIds) ? this.tagIds : [],
            tags: Array.isArray(this.tags) ? this.tags : []
        };

        // Only include imageUrl if it's set
        if (this.imageUrl) {
            data.imageUrl = this.imageUrl;
        }

        if (!data.tagIds || data.tagIds.length === 0) {
            delete data.tagIds;
        }
        if (!data.tags || data.tags.length === 0) {
            delete data.tags;
        }

        return data;
    }
}
