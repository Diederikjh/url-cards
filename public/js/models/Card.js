/**
 * Card model - represents a card data object
 * This is a data-only class with no business logic
 */
export class Card {
    constructor(id, userId, boardId, url, title, description, imageUrl, createdAt) {
        this.id = id;
        this.userId = userId;
        this.boardId = boardId;
        this.url = url;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
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
            data.createdAt
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
            createdAt: this.createdAt
        };

        // Only include imageUrl if it's set
        if (this.imageUrl) {
            data.imageUrl = this.imageUrl;
        }

        return data;
    }
}
