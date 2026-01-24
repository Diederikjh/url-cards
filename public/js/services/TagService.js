/**
 * TagService - Abstract interface for tag operations
 * Defines the contract that all tag service implementations must follow
 */
export class TagService {
    /**
     * Get all tags for a user
     * @param {string} userId - The user's ID
     * @returns {Promise<Array<Tag>>}
     * @throws NotImplementedError
     */
    async getTags(userId) {
        throw new Error('getTags() must be implemented');
    }

    /**
     * Watch for real-time changes to a user's tags
     * @param {string} userId - The user's ID
     * @param {Function} callback - Called with tags list whenever it changes
     * @returns {Function} Unsubscribe function
     * @throws NotImplementedError
     */
    watchTags(userId, callback) {
        throw new Error('watchTags() must be implemented');
    }

    /**
     * Create a new tag
     * @param {string} userId - The user's ID
     * @param {Object} tagData - Tag data (name, nameLower, color)
     * @returns {Promise<string>} The new tag's ID
     * @throws NotImplementedError
     */
    async createTag(userId, tagData) {
        throw new Error('createTag() must be implemented');
    }

    /**
     * Update a tag
     * @param {string} tagId - The tag's ID
     * @param {Object} updates - Object with properties to update
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async updateTag(tagId, updates) {
        throw new Error('updateTag() must be implemented');
    }

    /**
     * Delete a tag and remove it from all cards
     * @param {string} tagId - The tag's ID
     * @param {string} userId - The user's ID
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async deleteTag(tagId, userId) {
        throw new Error('deleteTag() must be implemented');
    }

    /**
     * Search tags by prefix (case-insensitive)
     * @param {string} userId - The user's ID
     * @param {string} prefix - Prefix to search (already trimmed)
     * @returns {Promise<Array<Tag>>}
     * @throws NotImplementedError
     */
    async searchTagsByPrefix(userId, prefix) {
        throw new Error('searchTagsByPrefix() must be implemented');
    }
}
