/**
 * FirestoreCardService - Firestore implementation of CardService
 * Handles all card operations with Firestore database
 */
import { CardService } from './CardService.js';
import { Card } from '../models/Card.js';

export class FirestoreCardService extends CardService {
    constructor(db) {
        super();
        this.db = db;
        this.cardsCollection = db.collection('cards');
    }

    async getCards(userId, boardId) {
        const snapshot = await this.cardsCollection
            .where('userId', '==', userId)
            .where('boardId', '==', boardId)
            .orderBy('rank', 'asc')
            .get();

        return snapshot.docs.map(doc => Card.fromFirestore(doc.id, doc.data()));
    }

    async getCard(cardId, userId) {
        const doc = await this.cardsCollection.doc(cardId).get();

        if (!doc.exists) {
            throw new Error(`Card ${cardId} not found`);
        }

        const cardData = doc.data();
        if (cardData.userId !== userId) {
            throw new Error('Unauthorized: Card does not belong to this user');
        }

        return Card.fromFirestore(doc.id, cardData);
    }

    async createCard(userId, boardId, cardData) {
        const docRef = await this.cardsCollection.add({
            userId,
            boardId,
            url: cardData.url,
            title: cardData.title,
            description: cardData.description,
            imageUrl: cardData.imageUrl || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            rank: -Date.now() // Default to Newest First (smaller rank = earlier sort order)
        });

        return docRef.id;
    }

    async updateCard(cardId, updates) {
        await this.cardsCollection.doc(cardId).update(updates);
    }

    async updateCardRanks(updates) {
        const batch = this.db.batch();

        for (const [cardId, rank] of Object.entries(updates)) {
            const ref = this.cardsCollection.doc(cardId);
            batch.update(ref, { rank });
        }

        await batch.commit();
    }

    async deleteCard(cardId) {
        await this.cardsCollection.doc(cardId).delete();
    }

    watchCards(userId, boardId, callback) {
        return this.cardsCollection
            .where('userId', '==', userId)
            .where('boardId', '==', boardId)
            .orderBy('rank', 'asc')
            .onSnapshot((snapshot) => {
                const cards = snapshot.docs.map(doc => Card.fromFirestore(doc.id, doc.data()));
                callback(cards);
            });
    }

    async getPublicBoardCards(boardId) {
        const snapshot = await this.cardsCollection
            .where('boardId', '==', boardId)
            .orderBy('rank', 'asc')
            .get();

        return snapshot.docs.map(doc => Card.fromFirestore(doc.id, doc.data()));
    }

    watchPublicBoardCards(boardId, callback) {
        return this.cardsCollection
            .where('boardId', '==', boardId)
            .orderBy('rank', 'asc')
            .onSnapshot((snapshot) => {
                const cards = snapshot.docs.map(doc => Card.fromFirestore(doc.id, doc.data()));
                callback(cards);
            });
    }
}
