# URL Cards

A simple web app for creating and managing cards from URLs. Each card displays the title and description extracted from a URL, with user editing capabilities.

## Features

- **URL-based Cards**: Add URLs to create cards with auto-extracted metadata
- **Editable Content**: Modify card titles and descriptions
- **Google Authentication**: Secure user login via Google accounts
- **Real-time Sync**: Cards sync across devices using Firebase
- **Responsive Design**: Works on desktop and mobile

## Architecture

### Frontend
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Hosting**: Firebase Hosting
- **Authentication**: Firebase Auth (Google provider)
- **Database**: Firebase Firestore

### Backend
- **Functions**: Firebase Cloud Functions
- **Purpose**: URL metadata extraction (handles CORS, fetches page titles/descriptions)

### Data Flow
1. User enters URL
2. Frontend calls Firebase Function to extract metadata
3. Card created with title/description (user can edit)
4. Card saved to Firestore (user-specific collection)
5. Real-time updates across all user's devices

## Quick Start

### Prerequisites
- Node.js 16+
- Firebase CLI (`npm install -g firebase-tools`)
- Google account

### Setup
1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd cards
   npm install
   ```

2. **Firebase setup**:
   ```bash
   firebase login
   firebase init
   # Select: Hosting, Functions, Firestore
   # Use existing project or create new one
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your Firebase config keys
   ```

4. **Local development**:
   ```bash
   firebase emulators:start
   # App available at http://localhost:5000
   ```

5. **Deploy**:
   ```bash
   firebase deploy
   ```

## Project Structure

```
├── public/              # Static frontend files
│   ├── index.html      # Main app
│   ├── styles.css      # Styling
│   └── script.js       # Frontend logic
├── functions/          # Backend functions
│   ├── index.js       # URL metadata extraction
│   └── package.json   # Function dependencies
├── firestore.rules    # Database security rules
├── firebase.json      # Firebase configuration
├── .firebaserc       # Project settings
└── README.md         # This file
```

## Development Workflow

1. **Local development**: `firebase emulators:start`
2. **Test changes**: Hot reload in browser
3. **Deploy**: `firebase deploy`
4. **Auto-deploy**: Push to main branch (GitHub Actions)

## Cost Expectations

**Firebase Free Tier (Spark Plan)**:
- Hosting: 10GB storage, 360MB/day transfer
- Firestore: 50K reads, 20K writes, 1GB storage/day
- Functions: 125K invocations, 40K GB-seconds/month
- Auth: Unlimited users

**Typical monthly cost**: $0 for personal use, ~$5-25 for moderate usage

## Security

- User authentication required for all operations
- Firestore rules enforce user data isolation
- Functions validate inputs and handle CORS safely
- No API keys exposed to frontend

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes with local emulator testing
4. Submit pull request
5. Auto-deploy to preview environment