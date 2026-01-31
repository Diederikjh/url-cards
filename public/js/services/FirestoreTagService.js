/**
 * FirestoreTagService - Firestore implementation of TagService
 * Handles all tag operations with Firestore database
 */
import { TagService } from './TagService.js';
import { Tag } from '../models/Tag.js';
import { computeTagUsageCounts } from '../utils/tagUsage.mjs';

export class FirestoreTagService extends TagService {
    constructor(db) {
        super();
        this.db = db;
        this.tagsCollection = db.collection('tags');
        this.cardsCollection = db.collection('cards');
    }

    async getTags(userId) {
        const snapshot = await this.tagsCollection
            .where('userId', '==', userId)
            .orderBy('nameLower', 'asc')
            .get();

        return snapshot.docs.map(doc => Tag.fromFirestore(doc.id, doc.data()));
    }

    watchTags(userId, callback) {
        return this.tagsCollection
            .where('userId', '==', userId)
            .orderBy('nameLower', 'asc')
            .onSnapshot((snapshot) => {
                const tags = snapshot.docs.map(doc => Tag.fromFirestore(doc.id, doc.data()));
                callback(tags);
            });
    }

    async createTag(userId, tagData) {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await this.tagsCollection.add({
            userId,
            name: tagData.name,
            nameLower: tagData.nameLower,
            color: tagData.color,
            createdAt: now,
            updatedAt: now
        });
        return docRef.id;
    }

    async updateTag(tagId, updates) {
        await this.tagsCollection.doc(tagId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const tagDoc = await this.tagsCollection.doc(tagId).get();
        if (!tagDoc.exists) return;
        const tagData = tagDoc.data();

        const snapshot = await this.cardsCollection
            .where('userId', '==', tagData.userId)
            .where('tagIds', 'array-contains', tagId)
            .get();

        if (snapshot.empty) return;

        const docs = snapshot.docs;
        const batchSize = 450;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = this.db.batch();
            docs.slice(i, i + batchSize).forEach((doc) => {
                const data = doc.data();
                const existingTags = Array.isArray(data.tags) ? data.tags : [];
                let nextTags = existingTags.map((tag) => {
                    if (tag && tag.id === tagId) {
                        return {
                            ...tag,
                            name: updates.name || tag.name,
                            nameLower: updates.nameLower || tag.nameLower,
                            color: updates.color || tag.color
                        };
                    }
                    return tag;
                });
                if (nextTags.length === 0) {
                    nextTags = [{
                        id: tagId,
                        name: updates.name || tagData.name,
                        nameLower: updates.nameLower || tagData.nameLower,
                        color: updates.color || tagData.color
                    }];
                }
                batch.update(doc.ref, { tags: nextTags });
            });
            await batch.commit();
        }
    }

    async deleteTag(tagId, userId) {
        const tagRef = this.tagsCollection.doc(tagId);
        const cardsQuery = this.cardsCollection
            .where('userId', '==', userId)
            .where('tagIds', 'array-contains', tagId);

        const snapshot = await cardsQuery.get();
        const docs = snapshot.docs;
        const batchSize = 450;

        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = this.db.batch();
            docs.slice(i, i + batchSize).forEach((doc) => {
                const data = doc.data();
                const existingTags = Array.isArray(data.tags) ? data.tags : [];
                const nextTags = existingTags.filter((tag) => tag && tag.id !== tagId);
                batch.update(doc.ref, {
                    tagIds: firebase.firestore.FieldValue.arrayRemove(tagId),
                    tags: nextTags
                });
            });
            await batch.commit();
        }

        await tagRef.delete();
    }

    async searchTagsByPrefix(userId, prefix) {
        const prefixLower = prefix.toLowerCase();
        const snapshot = await this.tagsCollection
            .where('userId', '==', userId)
            .orderBy('nameLower', 'asc')
            .startAt(prefixLower)
            .endAt(`${prefixLower}\uf8ff`)
            .get();

        return snapshot.docs.map(doc => Tag.fromFirestore(doc.id, doc.data()));
    }

    watchTagUsageCounts(userId, callback) {
        return this.cardsCollection
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                const cards = snapshot.docs.map((doc) => doc.data());
                callback(computeTagUsageCounts(cards));
            });
    }
}
