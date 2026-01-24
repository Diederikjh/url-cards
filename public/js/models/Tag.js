/**
 * Tag model - represents a tag data object
 * This is a data-only class with no business logic
 */
export class Tag {
    constructor(id, userId, name, nameLower, color, createdAt, updatedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.nameLower = nameLower;
        this.color = color;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Create a Tag from Firestore document data
     * @param {string} id - Document ID
     * @param {Object} data - Firestore document data
     * @returns {Tag}
     */
    static fromFirestore(id, data) {
        return new Tag(
            id,
            data.userId,
            data.name,
            data.nameLower || (data.name || '').toLowerCase(),
            data.color || '#dfe9f3',
            data.createdAt,
            data.updatedAt
        );
    }

    /**
     * Convert Tag to plain object for Firestore
     * @returns {Object} Data suitable for Firestore
     */
    toFirestore() {
        return {
            userId: this.userId,
            name: this.name,
            nameLower: this.nameLower,
            color: this.color,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
