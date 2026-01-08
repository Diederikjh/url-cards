let db;
let cardsCollection;
let boardsCollection;
let currentUser = null;
let currentBoardId = null;
let boardsUnsubscribe = null;
let cardsUnsubscribe = null;
let boardsGeneration = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Card-related elements
    const urlInput = document.getElementById('urlInput');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardsContainer = document.getElementById('cardsContainer');

    // Auth elements
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');

    // View elements
    const boardsView = document.getElementById('boardsView');
    const boardView = document.getElementById('boardView');

    // Board-related elements
    const createBoardBtn = document.getElementById('createBoardBtn');
    const boardsList = document.getElementById('boardsList');
    const backToBoards = document.getElementById('backToBoards');
    const boardName = document.getElementById('boardName');
    const renameBoardBtn = document.getElementById('renameBoardBtn');
    const deleteBoardBtn = document.getElementById('deleteBoardBtn');

    // Wait for Firebase to initialize
    document.addEventListener('firebaseLoaded', initializeApp);

    // Fallback: try to initialize after a short delay
    setTimeout(initializeApp, 1000);

    function initializeApp() {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                console.log('Firebase not ready yet');
                return;
            }

            // Connect to emulators if running locally
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                console.log('Running locally - connecting to emulators');
                firebase.auth().useEmulator('http://localhost:9099');
                firebase.firestore().useEmulator('localhost', 8080);
                firebase.app().functions(CONFIG.REGION).useEmulator('localhost', 5001);
            }

            db = firebase.firestore();
            cardsCollection = db.collection('cards');
            boardsCollection = db.collection('boards');

            // Set up authentication state listener
            firebase.auth().onAuthStateChanged((user) => {
                currentUser = user;
                updateUIForAuth(user);

                if (user) {
                    console.log('User signed in:', user.email);
                    ensureDefaultBoard().then(() => {
                        handleRouting();
                    });
                } else {
                    console.log('User signed out');
                    showView('login');
                }
            });

            // Set up hash routing
            window.addEventListener('hashchange', handleRouting);

            // Set up login/logout handlers
            loginBtn.addEventListener('click', handleLogin);
            logoutBtn.addEventListener('click', handleLogout);

            // Set up board handlers
            createBoardBtn.addEventListener('click', handleCreateBoard);
            backToBoards.addEventListener('click', () => {
                window.location.hash = '#boards';
            });
            renameBoardBtn.addEventListener('click', handleRenameBoard);
            deleteBoardBtn.addEventListener('click', handleDeleteBoard);

            // Set up card handlers
            addCardBtn.addEventListener('click', handleAddCard);
            urlInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleAddCard();
                }
            });

            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    function updateUIForAuth(user) {
        if (user) {
            // User is signed in
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userName.textContent = user.displayName || user.email;
        } else {
            // User is signed out
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    function showView(view) {
        boardsView.style.display = 'none';
        boardView.style.display = 'none';

        if (view === 'boards') {
            boardsView.style.display = 'block';
            loadBoards();
        } else if (view === 'board') {
            boardView.style.display = 'block';
        }
    }

    function handleRouting() {
        if (!currentUser) {
            return;
        }

        const hash = window.location.hash;

        if (!hash || hash === '#boards') {
            showView('boards');
        } else if (hash.startsWith('#board/')) {
            const boardId = hash.substring(7);
            currentBoardId = boardId;
            showView('board');
            loadBoard(boardId);
        } else {
            // Default to boards view
            window.location.hash = '#boards';
        }
    }

    async function ensureDefaultBoard() {
        if (!currentUser) return;

        try {
            const snapshot = await boardsCollection
                .where('userId', '==', currentUser.uid)
                .limit(1)
                .get();

            if (snapshot.empty) {
                // Create default board
                console.log('Creating default board for new user');
                await boardsCollection.add({
                    name: 'My First Board',
                    userId: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error ensuring default board:', error);
        }
    }

    async function handleCreateBoard() {
        const name = prompt('Enter board name:');
        if (!name || !name.trim()) return;

        try {
            await boardsCollection.add({
                name: name.trim(),
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating board:', error);
            alert('Failed to create board. Please try again.');
        }
    }

    function loadBoards() {
        if (!currentUser) return;

        // Unsubscribe from previous listener if it exists
        if (boardsUnsubscribe) {
            boardsUnsubscribe();
        }

        boardsUnsubscribe = boardsCollection
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'asc')
            .onSnapshot(async (snapshot) => {
                // Increment generation for this snapshot
                const currentGeneration = ++boardsGeneration;

                // Create all board elements in parallel
                const boardElements = await Promise.all(
                    snapshot.docs.map(doc => createBoardElement(doc.id, doc.data()))
                );

                // Only update DOM if this is still the latest snapshot
                if (currentGeneration === boardsGeneration) {
                    boardsList.innerHTML = '';
                    boardElements.forEach(element => {
                        boardsList.appendChild(element);
                    });
                }
            });
    }

    async function createBoardElement(id, board) {
        const boardDiv = document.createElement('div');
        boardDiv.className = 'board-item';
        boardDiv.onclick = () => {
            window.location.hash = `#board/${id}`;
        };

        // Get card count for this board
        const cardsSnapshot = await cardsCollection
            .where('userId', '==', currentUser.uid)
            .where('boardId', '==', id)
            .get();

        const cardCount = cardsSnapshot.size;

        boardDiv.innerHTML = `
            <div class="board-item-name">${board.name}</div>
            <div class="board-item-count">${cardCount} ${cardCount === 1 ? 'card' : 'cards'}</div>
        `;

        return boardDiv;
    }

    async function loadBoard(boardId) {
        if (!currentUser || !boardId) return;

        try {
            const doc = await boardsCollection.doc(boardId).get();
            if (!doc.exists || doc.data().userId !== currentUser.uid) {
                alert('Board not found');
                window.location.hash = '#boards';
                return;
            }

            const board = doc.data();
            boardName.textContent = board.name;
            loadCards(boardId);
        } catch (error) {
            console.error('Error loading board:', error);
            alert('Failed to load board');
            window.location.hash = '#boards';
        }
    }

    async function handleRenameBoard() {
        if (!currentBoardId) return;

        const doc = await boardsCollection.doc(currentBoardId).get();
        const currentName = doc.data().name;
        const newName = prompt('Enter new board name:', currentName);

        if (!newName || !newName.trim() || newName.trim() === currentName) return;

        try {
            await boardsCollection.doc(currentBoardId).update({
                name: newName.trim()
            });
            boardName.textContent = newName.trim();
        } catch (error) {
            console.error('Error renaming board:', error);
            alert('Failed to rename board. Please try again.');
        }
    }

    async function handleDeleteBoard() {
        if (!currentBoardId) return;

        if (!confirm('Are you sure you want to delete this board? All cards in this board will also be deleted.')) {
            return;
        }

        try {
            // Delete all cards in the board
            const cardsSnapshot = await cardsCollection
                .where('userId', '==', currentUser.uid)
                .where('boardId', '==', currentBoardId)
                .get();

            const batch = db.batch();
            cardsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete the board
            batch.delete(boardsCollection.doc(currentBoardId));

            await batch.commit();
            window.location.hash = '#boards';
        } catch (error) {
            console.error('Error deleting board:', error);
            alert('Failed to delete board. Please try again.');
        }
    }

    async function handleLogin() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);
        } catch (error) {
            console.error('Login error:', error);
            alert('Failed to sign in. Please try again.');
        }
    }

    async function handleLogout() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to sign out. Please try again.');
        }
    }

    async function handleAddCard() {
        const url = urlInput.value.trim();
        if (!url) return;

        if (!isValidUrl(url)) {
            alert('Please enter a valid URL');
            return;
        }

        addCardBtn.disabled = true;
        addCardBtn.textContent = 'Adding...';

        try {
            const metadata = await extractMetadata(url);
            await addCard(url, metadata.title, metadata.description, metadata.imageUrl);
            urlInput.value = '';
        } catch (error) {
            console.error('Error adding card:', error);
            alert('Failed to add card. Please try again.');
        } finally {
            addCardBtn.disabled = false;
            addCardBtn.textContent = 'Add Card';
        }
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async function extractMetadata(url) {
        try {
            console.log('Calling Firebase Function to extract metadata for:', url);
            // Use configured region (works for both emulator and production)
            const functions = firebase.app().functions(CONFIG.REGION);
            const extractMetadataFunc = functions.httpsCallable('extractMetadata');
            const result = await extractMetadataFunc({ url });
            
            console.log('Metadata extraction result:', result.data);
            return {
                title: result.data.title,
                description: result.data.description,
                imageUrl: result.data.imageUrl
            };
        } catch (error) {
            console.warn('Firebase Function failed, using fallback:', error);
            return {
                title: new URL(url).hostname,
                description: 'Click to edit description'
            };
        }
    }

    async function addCard(url, title, description, imageUrl) {
        if (!currentUser) {
            console.error('No user signed in');
            return;
        }

        if (!currentBoardId) {
            console.error('No board selected');
            return;
        }

        const card = {
            url: url,
            title: title,
            description: description,
            imageUrl: imageUrl,
            userId: currentUser.uid,
            boardId: currentBoardId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await cardsCollection.add(card);
    }

    function loadCards(boardId) {
        if (!currentUser) {
            console.log('No user signed in, not loading cards');
            return;
        }

        if (!boardId) {
            console.log('No board selected');
            return;
        }

        // Unsubscribe from previous listener if it exists
        if (cardsUnsubscribe) {
            cardsUnsubscribe();
        }

        cardsUnsubscribe = cardsCollection
            .where('userId', '==', currentUser.uid)
            .where('boardId', '==', boardId)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                cardsContainer.innerHTML = '';
                snapshot.forEach((doc) => {
                    const card = doc.data();
                    const cardElement = createCardElement(doc.id, card);
                    cardsContainer.appendChild(cardElement);
                });
            });
    }

    function createCardElement(id, card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.setAttribute('data-card-id', id);
        
        const imageHtml = card.imageUrl ? 
            `<div class="card-image"><img src="${card.imageUrl}" alt="${card.title}" onerror="this.parentElement.style.display='none'"></div>` : 
            '';
        
        cardDiv.innerHTML = `
            ${imageHtml}
            <div class="card-content">
                <div class="card-url"><a href="${card.url}" target="_blank" rel="noopener noreferrer">${card.url}</a></div>
                <div class="card-title" data-field="title">${card.title}</div>
                <div class="card-description" data-field="description">${card.description}</div>
                <div class="card-actions">
                    <button class="edit-btn" onclick="editCard('${id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteCard('${id}')">Delete</button>
                </div>
            </div>
        `;
        return cardDiv;
    }

    window.editCard = function(cardId) {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;

        const titleEl = card.querySelector('[data-field="title"]');
        const descEl = card.querySelector('[data-field="description"]');
        const editBtn = card.querySelector('.edit-btn');

        titleEl.contentEditable = true;
        descEl.contentEditable = true;
        titleEl.focus();

        editBtn.textContent = 'Save';
        editBtn.onclick = () => saveCard(cardId);
        editBtn.className = 'save-btn';
    }

    window.saveCard = async function(cardId) {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;

        const titleEl = card.querySelector('[data-field="title"]');
        const descEl = card.querySelector('[data-field="description"]');
        const saveBtn = card.querySelector('.save-btn');

        const newTitle = titleEl.textContent.trim();
        const newDescription = descEl.textContent.trim();

        try {
            await cardsCollection.doc(cardId).update({
                title: newTitle,
                description: newDescription
            });

            titleEl.contentEditable = false;
            descEl.contentEditable = false;

            saveBtn.textContent = 'Edit';
            saveBtn.onclick = () => editCard(cardId);
            saveBtn.className = 'edit-btn';
        } catch (error) {
            console.error('Error updating card:', error);
            alert('Failed to save changes. Please try again.');
        }
    }

    window.deleteCard = async function(cardId) {
        if (confirm('Are you sure you want to delete this card?')) {
            try {
                await cardsCollection.doc(cardId).delete();
            } catch (error) {
                console.error('Error deleting card:', error);
                alert('Failed to delete card. Please try again.');
            }
        }
    }
});