// Firebase initialization module
export let db;
export let cardsCollection;
export let boardsCollection;

export function initializeFirebase() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.log('Firebase not ready yet');
        return false;
    }

    // Connect to emulators if running locally
    // Note: Emulator configuration is now handled in index.html to avoid race conditions

    db = firebase.firestore();
    cardsCollection = db.collection('cards');
    boardsCollection = db.collection('boards');

    console.log('Firebase initialized successfully');
    return true;
}
