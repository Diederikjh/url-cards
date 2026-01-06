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
   - Note your project ID (you'll need it in the next step)

3. **Enable required APIs** (IMPORTANT):

   **Note**: This requires the gcloud CLI to be installed. If you don't have it, install it from [Google Cloud SDK documentation](https://cloud.google.com/sdk/docs/install).

   Run the automated setup script to enable all required APIs:
   ```bash
   ./setup-apis.sh your-project-id
   ```

   This enables:
   - **Cloud Build API** (required for Functions deployment)
   - **Cloud Functions API** (required for Functions)
   - **Firebase Extensions API** (required for deployment)
   - **Cloud Run API** (required for Functions v2)
   - **Eventarc API** (required for event-driven functions)
   - **Cloud Billing API** (required for project billing operations)

   **Manual alternative**: If you prefer, you can enable these APIs manually:
   - Go to [Google Cloud Console](https://console.cloud.google.com) > "APIs & Services" > "Library"
   - Search for and enable each API listed above

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

6. **Set up Functions cleanup policy**:

   If this is your first time deploying Cloud Functions to this region, set up a cleanup policy to manage old function artifacts:
   ```bash
   firebase functions:artifacts:setpolicy --location africa-south1
   ```

   Replace `africa-south1` with your chosen region if different. This prevents storage costs from accumulating old function versions.

7. **Local development**:
   ```bash
   firebase emulators:start
   # App available at http://localhost:5000
   # Functions at http://localhost:5001
   # Firestore UI at http://localhost:4000
   ```

8. **Deploy**:
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

2. **Configure service account permissions** (IMPORTANT):

   The auto-generated service account needs additional permissions to deploy Cloud Functions. Without these, deployment will fail with "Missing permissions" error.

   - Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
   - Select your project
   - Find the GitHub Actions service account (named like `github-action-XXXXX@your-project.iam.gserviceaccount.com`)
   - Edit and add these roles:
     - **Service Account User**
     - **Cloud Functions Admin**
     - **Firebase Admin**

   See the [Troubleshooting section](#github-actions-deployment-fails-with-missing-permissions-error) for detailed instructions.

3. **Verify secrets**:
   - Check that `FIREBASE_SERVICE_ACCOUNT_URL_CARDS` is in your GitHub repo secrets
   - This was created automatically by the Firebase CLI

4. **Push to deploy**:
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
├── setup-apis.sh     # API setup automation script
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

**Solution**: Run the setup script to enable all required APIs:
```bash
./setup-apis.sh your-project-id
```

**Manual alternative**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable:
   - Cloud Build API
   - Cloud Functions API
   - Firebase Extensions API
   - Cloud Run API
   - Eventarc API
   - Cloud Billing API

### Functions deployment warns about cleanup policy

**Problem**: Error message says "Functions successfully deployed but could not set up cleanup policy"

**Solution**: Set up a cleanup policy for your region to manage old function artifacts:
```bash
firebase functions:artifacts:setpolicy --location africa-south1
```

Replace `africa-south1` with your region. This is typically only needed the first time you deploy functions to a region.

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