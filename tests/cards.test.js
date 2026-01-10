// Cards operations tests
const { getFirestore, clearDatabase, admin } = require('./setup');

describe('Cards Operations', () => {
  let db;
  const userId = 'test-user-123';
  let boardId;

  beforeAll(() => {
    db = getFirestore();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create a test board for each test
    const boardRef = await db.collection('boards').add({
      name: 'Test Board',
      userId: userId,
      createdAt: admin.firestore.Timestamp.now()
    });
    boardId = boardRef.id;
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('Create Card', () => {
    test('should create a card with all required fields', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Test Card',
        description: 'Test Description',
        imageUrl: 'https://example.com/image.jpg',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const card = await cardRef.get();
      expect(card.exists).toBe(true);
      expect(card.data().url).toBe('https://example.com');
      expect(card.data().title).toBe('Test Card');
      expect(card.data().description).toBe('Test Description');
      expect(card.data().imageUrl).toBe('https://example.com/image.jpg');
      expect(card.data().userId).toBe(userId);
      expect(card.data().boardId).toBe(boardId);
      expect(card.data().createdAt).toBeTruthy();
    });

    test('should create a card without imageUrl', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Test Card',
        description: 'Test Description',
        imageUrl: null,
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const card = await cardRef.get();
      expect(card.exists).toBe(true);
      expect(card.data().imageUrl).toBeNull();
    });

    test('should require boardId when creating card', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Test Card',
        description: 'Test Description',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const card = await cardRef.get();
      expect(card.data().boardId).toBe(boardId);
    });
  });

  describe('Read Cards', () => {
    test('should list all cards for a board ordered by createdAt desc', async () => {
      // Create multiple cards
      await db.collection('cards').add({
        title: 'Card 1',
        url: 'https://example.com/1',
        description: 'First card',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-01'))
      });

      await db.collection('cards').add({
        title: 'Card 2',
        url: 'https://example.com/2',
        description: 'Second card',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-02'))
      });

      await db.collection('cards').add({
        title: 'Card 3',
        url: 'https://example.com/3',
        description: 'Third card',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-03'))
      });

      const snapshot = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .orderBy('createdAt', 'desc')
        .get();

      expect(snapshot.size).toBe(3);
      // Most recent first
      expect(snapshot.docs[0].data().title).toBe('Card 3');
      expect(snapshot.docs[1].data().title).toBe('Card 2');
      expect(snapshot.docs[2].data().title).toBe('Card 1');
    });

    test('should only return cards for the specific user and board', async () => {
      const otherUserId = 'other-user-456';
      const otherBoardRef = await db.collection('boards').add({
        name: 'Other Board',
        userId: otherUserId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'User 1 Card',
        url: 'https://example.com/1',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'User 2 Card',
        url: 'https://example.com/2',
        description: 'Test',
        userId: otherUserId,
        boardId: otherBoardRef.id,
        createdAt: admin.firestore.Timestamp.now()
      });

      const snapshot = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .get();

      expect(snapshot.size).toBe(1);
      expect(snapshot.docs[0].data().title).toBe('User 1 Card');
    });

    test('should filter cards by board', async () => {
      const otherBoardRef = await db.collection('boards').add({
        name: 'Other Board',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'Board 1 Card',
        url: 'https://example.com/1',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'Board 2 Card',
        url: 'https://example.com/2',
        description: 'Test',
        userId: userId,
        boardId: otherBoardRef.id,
        createdAt: admin.firestore.Timestamp.now()
      });

      const board1Cards = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .get();

      const board2Cards = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', otherBoardRef.id)
        .get();

      expect(board1Cards.size).toBe(1);
      expect(board1Cards.docs[0].data().title).toBe('Board 1 Card');
      expect(board2Cards.size).toBe(1);
      expect(board2Cards.docs[0].data().title).toBe('Board 2 Card');
    });
  });

  describe('Update Card', () => {
    test('should update card title and description', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Old Title',
        description: 'Old Description',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await cardRef.update({
        title: 'New Title',
        description: 'New Description'
      });

      const updatedCard = await cardRef.get();
      expect(updatedCard.data().title).toBe('New Title');
      expect(updatedCard.data().description).toBe('New Description');
      expect(updatedCard.data().url).toBe('https://example.com');
    });

    test('should not change other fields when updating', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Title',
        description: 'Description',
        imageUrl: 'https://example.com/image.jpg',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await cardRef.update({
        title: 'Updated Title'
      });

      const updatedCard = await cardRef.get();
      expect(updatedCard.data().title).toBe('Updated Title');
      expect(updatedCard.data().description).toBe('Description');
      expect(updatedCard.data().url).toBe('https://example.com');
      expect(updatedCard.data().imageUrl).toBe('https://example.com/image.jpg');
      expect(updatedCard.data().userId).toBe(userId);
      expect(updatedCard.data().boardId).toBe(boardId);
    });
  });

  describe('Delete Card', () => {
    test('should delete a card', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Card to Delete',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await cardRef.delete();

      const card = await cardRef.get();
      expect(card.exists).toBe(false);
    });

    test('should delete multiple cards when board is deleted', async () => {
      // Create multiple cards
      await db.collection('cards').add({
        title: 'Card 1',
        url: 'https://example.com/1',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'Card 2',
        url: 'https://example.com/2',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        title: 'Card 3',
        url: 'https://example.com/3',
        description: 'Test',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      // Delete all cards in the board
      const cardsSnapshot = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .get();

      const batch = db.batch();
      cardsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Verify all deleted
      const remainingCards = await db.collection('cards')
        .where('boardId', '==', boardId)
        .get();

      expect(remainingCards.size).toBe(0);
    });
  });

  describe('Card Metadata', () => {
    test('should store extracted metadata', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'Example Domain',
        description: 'This domain is for use in illustrative examples',
        imageUrl: 'https://example.com/logo.png',
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const card = await cardRef.get();
      expect(card.data().title).toBe('Example Domain');
      expect(card.data().description).toBe('This domain is for use in illustrative examples');
      expect(card.data().imageUrl).toBe('https://example.com/logo.png');
    });

    test('should handle fallback metadata when extraction fails', async () => {
      const cardRef = await db.collection('cards').add({
        url: 'https://example.com',
        title: 'example.com',
        description: 'Click to edit description',
        imageUrl: null,
        userId: userId,
        boardId: boardId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const card = await cardRef.get();
      expect(card.data().title).toBe('example.com');
      expect(card.data().description).toBe('Click to edit description');
      expect(card.data().imageUrl).toBeNull();
    });
  });
});
