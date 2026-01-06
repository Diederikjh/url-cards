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
   cd functions && npm install && cd ..
   ```

2. **Create Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (or use existing)
   - Choose a project location (e.g., africa-south1, us-central1)

3. **Enable required APIs** (IMPORTANT):

   This is a common gotcha! Before deploying Cloud Functions, you must enable these APIs:

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your Firebase project
   - Navigate to "APIs & Services" > "Library"
   - Enable the following APIs:
     - **Cloud Build API** (required for Functions deployment)
     - **Cloud Functions API** (required for Functions)

   Alternatively, use the gcloud CLI:
   ```bash
   gcloud services enable cloudbuild.googleapis.com --project=your-project-id
   gcloud services enable cloudfunctions.googleapis.com --project=your-project-id
   ```

4. **Firebase CLI setup**:
   ```bash
   firebase login
   firebase init
   # Select: Hosting, Functions, Firestore
   # Choose your project
   # Accept defaults or customize as needed
   ```

5. **Configure Firestore**:
   - In Firebase Console, go to Firestore Database
   - Create database in the same region as your project
   - Start in production mode (rules are already in firestore.rules)

6. **Local development**:
   ```bash
   firebase emulators:start
   # App available at http://localhost:5000
   # Functions at http://localhost:5001
   # Firestore UI at http://localhost:4000
   ```

7. **Deploy**:
   ```bash
   firebase deploy
   ```

### GitHub Actions Deployment (Optional)

To enable automatic deployments on push to main:

1. **Generate service account**:
   ```bash
   firebase init hosting:github
   # Follow prompts to set up GitHub Actions
   ```

2. **Verify secrets**:
   - Check that `FIREBASE_SERVICE_ACCOUNT_URL_CARDS` is in your GitHub repo secrets
   - This was created automatically by the Firebase CLI

3. **Push to deploy**:
   ```bash
   git push origin main
   # Triggers automatic deployment
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

## Troubleshooting

### Cloud Functions deployment fails with "Cloud Build API" error

**Problem**: Error message says "Cloud Functions deployment requires the Cloud Build API to be enabled"

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable "Cloud Build API"
5. Also enable "Cloud Functions API" if not already enabled

Alternatively, use the gcloud CLI:
```bash
gcloud services enable cloudbuild.googleapis.com --project=your-project-id
gcloud services enable cloudfunctions.googleapis.com --project=your-project-id
```

### GitHub Actions deployment fails with "Missing permissions" error

**Problem**: Error message says "Missing permissions required for functions deploy. You must have permission iam.serviceAccounts.ActAs"

**Solution**: The service account used by GitHub Actions needs additional permissions.

1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. Select your project
3. Find the service account (usually named like `github-action-XXXXX@your-project.iam.gserviceaccount.com`)
4. Click the pencil icon to edit
5. Add these roles:
   - **Service Account User** (grants iam.serviceAccounts.ActAs)
   - **Cloud Functions Admin** (or Cloud Functions Developer)
   - **Firebase Admin**
6. Save changes

Alternatively, use the gcloud CLI:
```bash
# Replace SERVICE_ACCOUNT with your actual service account email
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:SERVICE_ACCOUNT" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:SERVICE_ACCOUNT" \
  --role="roles/cloudfunctions.admin"
```

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes with local emulator testing
4. Submit pull request
5. Auto-deploy to preview environment