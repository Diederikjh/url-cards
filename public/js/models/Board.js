/**
 * Board model - represents a board data object
 * This is a data-only class with no business logic
 */
export class Board {
    constructor(id, userId, name, createdAt, isPublic = false, publicShareId = null) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.createdAt = createdAt;
        this.isPublic = isPublic;
        this.publicShareId = publicShareId;
    }

    /**
     * Create a Board from Firestore document data
     * @param {string} id - Document ID
     * @param {Object} data - Firestore document data
     * @returns {Board}
     */
    static fromFirestore(id, data) {
        return new Board(
            id,
            data.userId,
            data.name,
            data.createdAt,
            data.isPublic || false,
            data.publicShareId || null
        );
    }

    /**
     * Convert Board to plain object for Firestore
     * @returns {Object} Data suitable for Firestore
     */
    toFirestore() {
        const data = {
            userId: this.userId,
            name: this.name,
            createdAt: this.createdAt,
            isPublic: this.isPublic
        };

        // Only include publicShareId if it's set
        if (this.publicShareId) {
            data.publicShareId = this.publicShareId;
        }

        return data;
    }
}
