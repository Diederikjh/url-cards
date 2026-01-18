/**
 * CardService - Abstract interface for card operations
 * Defines the contract that all card service implementations must follow
 */
export class CardService {
    /**
     * Get all cards for a board
     * @param {string} userId - The user's ID
     * @param {string} boardId - The board's ID
     * @returns {Promise<Array<Card>>}
     * @throws NotImplementedError
     */
    async getCards(userId, boardId) {
        throw new Error('getCards() must be implemented');
    }

    /**
     * Get a single card by ID
     * @param {string} cardId - The card's ID
     * @param {string} userId - The user's ID (for authorization)
     * @returns {Promise<Card>}
     * @throws NotImplementedError
     */
    async getCard(cardId, userId) {
        throw new Error('getCard() must be implemented');
    }

    /**
     * Create a new card
     * @param {string} userId - The user's ID
     * @param {string} boardId - The board's ID
     * @param {Object} cardData - Card data (url, title, description, imageUrl)
     * @returns {Promise<string>} The new card's ID
     * @throws NotImplementedError
     */
    async createCard(userId, boardId, cardData) {
        throw new Error('createCard() must be implemented');
    }

    /**
     * Update card properties
     * @param {string} cardId - The card's ID
     * @param {Object} updates - Object with properties to update
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async updateCard(cardId, updates) {
        throw new Error('updateCard() must be implemented');
    }

    /**
     * Delete a card
     * @param {string} cardId - The card's ID
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async deleteCard(cardId) {
        throw new Error('deleteCard() must be implemented');
    }

    /**
     * Watch for real-time changes to cards in a board
     * @param {string} userId - The user's ID
     * @param {string} boardId - The board's ID
     * @param {Function} callback - Called with cards list whenever it changes
     * @returns {Function} Unsubscribe function
     * @throws NotImplementedError
     */
    watchCards(userId, boardId, callback) {
        throw new Error('watchCards() must be implemented');
    }

    /**
     * Get cards for a public board
     * @param {string} boardId - The board's ID
     * @returns {Promise<Array<Card>>}
     * @throws NotImplementedError
     */
    async getPublicBoardCards(boardId) {
        throw new Error('getPublicBoardCards() must be implemented');
    }

    /**
     * Watch for real-time changes to cards in a public board
     * @param {string} boardId - The board's ID
     * @param {Function} callback - Called with cards list whenever it changes
     * @returns {Function} Unsubscribe function
     * @throws NotImplementedError
     */
    watchPublicBoardCards(boardId, callback) {
        throw new Error('watchPublicBoardCards() must be implemented');
    }
}
