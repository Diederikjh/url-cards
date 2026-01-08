# Code Structure

This document explains the modular architecture of the URL Cards application.

## Overview

The application has been refactored into ES6 modules for better separation of concerns and maintainability. Each module handles a specific aspect of the application.

## Module Structure

```
public/
├── index.html              # Main HTML structure
├── styles.css              # All styling
├── config.js               # Firebase configuration
└── js/
    ├── app.js              # Main orchestrator - initializes and connects all modules
    ├── firebase-init.js    # Firebase initialization and emulator setup
    ├── auth.js             # Authentication logic and UI updates
    ├── router.js           # Hash-based routing between views
    ├── boards.js           # Board CRUD operations and management
    └── cards.js            # Card CRUD operations and management
```

## Module Responsibilities

### `app.js` - Main Orchestrator
- Entry point for the application
- Initializes Firebase and all UI modules
- Sets up authentication state listener
- Coordinates between modules

**Key Functions:**
- `initializeApp()` - Initializes all modules
- `onAuthChanged(user)` - Handles authentication state changes
- `onBoardLoad(boardId)` - Loads board and its cards

### `firebase-init.js` - Firebase Setup
- Initializes Firebase SDK
- Connects to local emulators when running locally
- Exports Firestore collections

**Exports:**
- `db` - Firestore database instance
- `cardsCollection` - Cards collection reference
- `boardsCollection` - Boards collection reference
- `initializeFirebase()` - Initialization function

### `auth.js` - Authentication
- Manages user authentication state
- Updates UI based on auth state
- Handles login/logout

**Exports:**
- `getCurrentUser()` - Returns current authenticated user
- `initAuthUI()` - Initializes auth UI elements
- `setupAuthStateListener(callback)` - Sets up auth state listener

### `router.js` - Routing
- Manages hash-based routing
- Switches between boards list and board detail views
- Provides navigation functions

**Exports:**
- `initRouter(onBoardLoad)` - Initialize routing
- `handleRouting()` - Handle route changes
- `navigateToBoards()` - Navigate to boards list
- `navigateToBoard(id)` - Navigate to specific board
- `showLoginView()` - Show login view

### `boards.js` - Board Management
- Board CRUD operations (Create, Read, Update, Delete)
- Real-time board list updates with race condition handling
- Card count per board
- Default board creation for new users

**Exports:**
- `currentBoardId` - Currently selected board ID
- `initBoardsUI()` - Initialize board UI elements
- `ensureDefaultBoard()` - Create default board for new users
- `loadBoards()` - Load and subscribe to boards list
- `loadBoard(boardId)` - Load specific board details

**Key Features:**
- Uses generation counter pattern to prevent race conditions
- Batch deletes cards when deleting a board
- Real-time updates via Firestore snapshots

### `cards.js` - Card Management
- Card CRUD operations
- URL metadata extraction
- Inline editing support
- Real-time card updates

**Exports:**
- `initCardsUI()` - Initialize card UI elements
- `loadCards(boardId)` - Load and subscribe to cards for a board

**Global Functions (attached to window):**
- `window.editCard(cardId)` - Make card editable
- `window.saveCard(cardId)` - Save card changes
- `window.deleteCard(cardId)` - Delete a card

## Data Flow

1. **App Start:**
   ```
   index.html loads
   → app.js initializes
   → firebase-init.js sets up Firebase
   → auth.js sets up auth listener
   → auth state changes trigger onAuthChanged
   → ensureDefaultBoard creates board if needed
   → router handles initial route
   ```

2. **User Navigates:**
   ```
   User clicks board
   → navigateToBoard() called
   → URL hash changes
   → handleRouting() detects change
   → loadBoard() loads board details
   → loadCards() subscribes to cards
   ```

3. **User Adds Card:**
   ```
   User enters URL and clicks Add
   → handleAddCard() validates URL
   → extractMetadata() calls Firebase Function
   → addCard() saves to Firestore
   → Real-time listener updates UI
   ```

## Key Patterns

### Module Communication
Modules communicate through:
- **Exports/Imports:** Functions and state are shared via ES6 module exports
- **Callbacks:** Router accepts callbacks to notify when routes change
- **Shared References:** Firestore collections are initialized once and imported

### State Management
- **currentUser:** Managed in `auth.js`, accessed via `getCurrentUser()` function
- **currentBoardId:** Exported from `boards.js`, imported where needed
- **Firestore Subscriptions:** Cleaned up properly to prevent memory leaks

### Race Condition Handling
`boards.js` uses a generation counter pattern:
```javascript
const currentGeneration = ++boardsGeneration;
// ... async operations ...
if (currentGeneration === boardsGeneration) {
    // Only update if still the latest
}
```

This ensures that only the most recent snapshot updates the DOM, even when async operations complete out of order.

## Adding New Features

### To add a new view:
1. Add HTML structure to `index.html`
2. Add styling to `styles.css`
3. Add route handling in `router.js`
4. Create new module in `js/` if complex
5. Initialize in `app.js`

### To add new Firestore operations:
1. Add function to appropriate module (`boards.js` or `cards.js`)
2. Export if needed by other modules
3. Ensure proper error handling
4. Update Firestore rules if needed

## Testing Locally

```bash
# Start Firebase emulators
firebase emulators:start

# Access at http://localhost:5000
```

The app automatically detects localhost and connects to emulators.

## Migration from Old Structure

The previous `script.js` (522 lines) has been split into:
- `app.js` (49 lines) - orchestration
- `firebase-init.js` (26 lines) - Firebase setup
- `auth.js` (58 lines) - authentication
- `router.js` (50 lines) - routing
- `boards.js` (195 lines) - board management
- `cards.js` (215 lines) - card management

Total: ~593 lines with better organization and documentation.
