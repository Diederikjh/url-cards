// Boards operations tests
const { getFirestore, clearDatabase, admin } = require('./setup');

describe('Boards Operations', () => {
  let db;
  const userId = 'test-user-123';

  beforeAll(() => {
    db = getFirestore();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('Create Board', () => {
    test('should create a board with all required fields', async () => {
      const boardRef = await db.collection('boards').add({
        name: 'Test Board',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const board = await boardRef.get();
      expect(board.exists).toBe(true);
      expect(board.data().name).toBe('Test Board');
      expect(board.data().userId).toBe(userId);
      expect(board.data().createdAt).toBeTruthy();
    });

    test('should create default board for new user', async () => {
      // Simulate ensureDefaultBoard function
      const snapshot = await db.collection('boards')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        await db.collection('boards').add({
          name: 'My First Board',
          userId: userId,
          createdAt: admin.firestore.Timestamp.now()
        });
      }

      const boards = await db.collection('boards')
        .where('userId', '==', userId)
        .get();

      expect(boards.size).toBe(1);
      expect(boards.docs[0].data().name).toBe('My First Board');
    });

    test('should not create duplicate default board', async () => {
      // Create first board
      await db.collection('boards').add({
        name: 'My First Board',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      // Try to create default board again
      const snapshot = await db.collection('boards')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        await db.collection('boards').add({
          name: 'My First Board',
          userId: userId,
          createdAt: admin.firestore.Timestamp.now()
        });
      }

      const boards = await db.collection('boards')
        .where('userId', '==', userId)
        .get();

      expect(boards.size).toBe(1);
    });
  });

  describe('Read Boards', () => {
    test('should list all boards for a user ordered by createdAt', async () => {
      // Create multiple boards
      await db.collection('boards').add({
        name: 'Board 1',
        userId: userId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-01'))
      });

      await db.collection('boards').add({
        name: 'Board 2',
        userId: userId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-02'))
      });

      await db.collection('boards').add({
        name: 'Board 3',
        userId: userId,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-01-03'))
      });

      const snapshot = await db.collection('boards')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'asc')
        .get();

      expect(snapshot.size).toBe(3);
      expect(snapshot.docs[0].data().name).toBe('Board 1');
      expect(snapshot.docs[1].data().name).toBe('Board 2');
      expect(snapshot.docs[2].data().name).toBe('Board 3');
    });

    test('should only return boards for the specific user', async () => {
      const otherUserId = 'other-user-456';

      await db.collection('boards').add({
        name: 'User 1 Board',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('boards').add({
        name: 'User 2 Board',
        userId: otherUserId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const snapshot = await db.collection('boards')
        .where('userId', '==', userId)
        .get();

      expect(snapshot.size).toBe(1);
      expect(snapshot.docs[0].data().name).toBe('User 1 Board');
    });

    test('should read a specific board by ID', async () => {
      const boardRef = await db.collection('boards').add({
        name: 'Specific Board',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const board = await boardRef.get();

      expect(board.exists).toBe(true);
      expect(board.data().name).toBe('Specific Board');
      expect(board.data().userId).toBe(userId);
    });
  });

  describe('Update Board', () => {
    test('should rename a board', async () => {
      const boardRef = await db.collection('boards').add({
        name: 'Old Name',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await boardRef.update({
        name: 'New Name'
      });

      const updatedBoard = await boardRef.get();
      expect(updatedBoard.data().name).toBe('New Name');
      expect(updatedBoard.data().userId).toBe(userId);
    });
  });

  describe('Delete Board', () => {
    test('should delete a board', async () => {
      const boardRef = await db.collection('boards').add({
        name: 'Board to Delete',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      await boardRef.delete();

      const board = await boardRef.get();
      expect(board.exists).toBe(false);
    });

    test('should delete board and all its cards', async () => {
      // Create board
      const boardRef = await db.collection('boards').add({
        name: 'Board with Cards',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const boardId = boardRef.id;

      // Create cards
      await db.collection('cards').add({
        boardId: boardId,
        userId: userId,
        title: 'Card 1',
        url: 'https://example.com/1',
        description: 'Test card 1',
        createdAt: admin.firestore.Timestamp.now()
      });

      await db.collection('cards').add({
        boardId: boardId,
        userId: userId,
        title: 'Card 2',
        url: 'https://example.com/2',
        description: 'Test card 2',
        createdAt: admin.firestore.Timestamp.now()
      });

      // Delete board and cards (like the app does)
      const cardsSnapshot = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .get();

      const batch = db.batch();
      cardsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      batch.delete(boardRef);
      await batch.commit();

      // Verify deletion
      const boardExists = (await boardRef.get()).exists;
      const remainingCards = await db.collection('cards')
        .where('boardId', '==', boardId)
        .get();

      expect(boardExists).toBe(false);
      expect(remainingCards.size).toBe(0);
    });
  });

  describe('Board with Card Count', () => {
    test('should get correct card count for board', async () => {
      const boardRef = await db.collection('boards').add({
        name: 'Board with Cards',
        userId: userId,
        createdAt: admin.firestore.Timestamp.now()
      });

      const boardId = boardRef.id;

      // Add 3 cards
      for (let i = 1; i <= 3; i++) {
        await db.collection('cards').add({
          boardId: boardId,
          userId: userId,
          title: `Card ${i}`,
          url: `https://example.com/${i}`,
          description: `Test card ${i}`,
          createdAt: admin.firestore.Timestamp.now()
        });
      }

      // Get card count (like createBoardElement does)
      const cardsSnapshot = await db.collection('cards')
        .where('userId', '==', userId)
        .where('boardId', '==', boardId)
        .get();

      expect(cardsSnapshot.size).toBe(3);
    });
  });
});
