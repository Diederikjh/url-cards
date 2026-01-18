/**
 * FirestoreBoardService - Firestore implementation of BoardService
 * Handles all board operations with Firestore database
 */
import { BoardService } from './BoardService.js';
import { Board } from '../models/Board.js';

export class FirestoreBoardService extends BoardService {
    constructor(db, cardsCollection) {
        super();
        this.db = db;
        this.boardsCollection = db.collection('boards');
        this.cardsCollection = cardsCollection;
    }

    async getBoards(userId) {
        const snapshot = await this.boardsCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'asc')
            .get();

        return snapshot.docs.map(doc => Board.fromFirestore(doc.id, doc.data()));
    }

    async getBoard(boardId, userId) {
        const doc = await this.boardsCollection.doc(boardId).get();

        if (!doc.exists) {
            throw new Error(`Board ${boardId} not found`);
        }

        const boardData = doc.data();
        if (boardData.userId !== userId) {
            throw new Error('Unauthorized: Board does not belong to this user');
        }

        return Board.fromFirestore(doc.id, boardData);
    }

    async createBoard(userId, name) {
        const docRef = await this.boardsCollection.add({
            name,
            userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPublic: false
        });

        return docRef.id;
    }

    async updateBoard(boardId, updates) {
        await this.boardsCollection.doc(boardId).update(updates);
    }

    async deleteBoard(boardId, userId) {
        // Get all cards for this board
        const cardsSnapshot = await this.cardsCollection
            .where('userId', '==', userId)
            .where('boardId', '==', boardId)
            .get();

        // Use batch to delete all cards and the board
        const batch = this.db.batch();

        cardsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(this.boardsCollection.doc(boardId));

        await batch.commit();
    }

    watchBoards(userId, callback) {
        return this.boardsCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'asc')
            .onSnapshot((snapshot) => {
                const boards = snapshot.docs.map(doc => Board.fromFirestore(doc.id, doc.data()));
                callback(boards);
            });
    }

    async getPublicBoard(shareId) {
        const snapshot = await this.boardsCollection
            .where('publicShareId', '==', shareId)
            .where('isPublic', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new Error(`Public board with share ID ${shareId} not found`);
        }

        const doc = snapshot.docs[0];
        return Board.fromFirestore(doc.id, doc.data());
    }

    async getCardCount(boardId, userId) {
        const snapshot = await this.cardsCollection
            .where('userId', '==', userId)
            .where('boardId', '==', boardId)
            .get();

        return snapshot.size;
    }

    /**
     * Wait for a newly created board to appear in the real-time listener
     * Helps prevent race conditions after board creation
     * @param {string} userId - The user's ID
     * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
     * @returns {Promise<void>}
     */
    async waitForBoardToAppear(userId, timeoutMs = 5000) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('Timeout waiting for board to appear in listener');
                unsubscribe();
                resolve();
            }, timeoutMs);

            const unsubscribe = this.boardsCollection
                .where('userId', '==', userId)
                .limit(1)
                .onSnapshot((snapshot) => {
                    if (!snapshot.empty) {
                        console.log('Board appeared in listener');
                        clearTimeout(timeout);
                        unsubscribe();
                        resolve();
                    }
                });
        });
    }

    /**
     * Ensure user has at least one default board
     * @param {string} userId - The user's ID
     * @returns {Promise<void>}
     */
    async ensureDefaultBoard(userId) {
        const snapshot = await this.boardsCollection
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('Creating default board for new user');
            await this.createBoard(userId, 'My First Board');
            await this.waitForBoardToAppear(userId);
        }
    }

    /**
     * Generate a random share ID for public boards
     * @returns {string}
     */
    generateShareId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Toggle board public/private status
     * @param {string} boardId - The board's ID
     * @param {boolean} isPublic - Should the board be public?
     * @returns {Promise<void>}
     */
    async togglePublic(boardId, isPublic) {
        if (isPublic) {
            const shareId = this.generateShareId();
            await this.updateBoard(boardId, {
                isPublic: true,
                publicShareId: shareId
            });
        } else {
            await this.updateBoard(boardId, {
                isPublic: false,
                publicShareId: firebase.firestore.FieldValue.delete()
            });
        }
    }
}
