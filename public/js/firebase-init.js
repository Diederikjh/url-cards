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
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('Running locally - connecting to emulators');
        firebase.auth().useEmulator('http://localhost:9099');
        firebase.firestore().useEmulator('localhost', 8080);
        firebase.app().functions(CONFIG.REGION).useEmulator('localhost', 5001);
    }

    db = firebase.firestore();
    cardsCollection = db.collection('cards');
    boardsCollection = db.collection('boards');

    console.log('Firebase initialized successfully');
    return true;
}
