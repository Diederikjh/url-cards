/**
 * BoardService - Abstract interface for board operations
 * Defines the contract that all board service implementations must follow
 */
export class BoardService {
    /**
     * Get all boards for a user
     * @param {string} userId - The user's ID
     * @returns {Promise<Array<Board>>}
     * @throws NotImplementedError
     */
    async getBoards(userId) {
        throw new Error('getBoards() must be implemented');
    }

    /**
     * Get a single board by ID
     * @param {string} boardId - The board's ID
     * @param {string} userId - The user's ID (for authorization)
     * @returns {Promise<Board>}
     * @throws NotImplementedError
     */
    async getBoard(boardId, userId) {
        throw new Error('getBoard() must be implemented');
    }

    /**
     * Create a new board
     * @param {string} userId - The user's ID
     * @param {string} name - Board name
     * @returns {Promise<string>} The new board's ID
     * @throws NotImplementedError
     */
    async createBoard(userId, name) {
        throw new Error('createBoard() must be implemented');
    }

    /**
     * Update board properties
     * @param {string} boardId - The board's ID
     * @param {Object} updates - Object with properties to update
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async updateBoard(boardId, updates) {
        throw new Error('updateBoard() must be implemented');
    }

    /**
     * Delete a board and all its cards
     * @param {string} boardId - The board's ID
     * @param {string} userId - The user's ID
     * @returns {Promise<void>}
     * @throws NotImplementedError
     */
    async deleteBoard(boardId, userId) {
        throw new Error('deleteBoard() must be implemented');
    }

    /**
     * Watch for real-time changes to a user's boards
     * @param {string} userId - The user's ID
     * @param {Function} callback - Called with board list whenever it changes
     * @returns {Function} Unsubscribe function
     * @throws NotImplementedError
     */
    watchBoards(userId, callback) {
        throw new Error('watchBoards() must be implemented');
    }

    /**
     * Get a public board by share ID
     * @param {string} shareId - The share ID
     * @returns {Promise<Board>}
     * @throws NotImplementedError
     */
    async getPublicBoard(shareId) {
        throw new Error('getPublicBoard() must be implemented');
    }

    /**
     * Get card count for a board
     * @param {string} boardId - The board's ID
     * @param {string} userId - The user's ID
     * @returns {Promise<number>}
     * @throws NotImplementedError
     */
    async getCardCount(boardId, userId) {
        throw new Error('getCardCount() must be implemented');
    }
}
