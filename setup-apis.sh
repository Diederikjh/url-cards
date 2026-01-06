#!/bin/bash

# Firebase URL Cards - API Setup Script
# This script enables all required Google Cloud APIs for the project

set -e

# Check if project ID is provided
if [ -z "$1" ]; then
    echo "Error: Project ID is required"
    echo "Usage: ./setup-apis.sh YOUR-PROJECT-ID"
    exit 1
fi

PROJECT_ID=$1

echo "================================================"
echo "Firebase URL Cards - API Setup"
echo "================================================"
echo "Project ID: $PROJECT_ID"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "Enabling required APIs for project: $PROJECT_ID"
echo ""

# Enable Cloud Build API
echo "1/5 Enabling Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
echo "✓ Cloud Build API enabled"
echo ""

# Enable Cloud Functions API
echo "2/5 Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID
echo "✓ Cloud Functions API enabled"
echo ""

# Enable Firebase Extensions API
echo "3/5 Enabling Firebase Extensions API..."
gcloud services enable firebaseextensions.googleapis.com --project=$PROJECT_ID
echo "✓ Firebase Extensions API enabled"
echo ""

# Enable Cloud Run API
echo "4/5 Enabling Cloud Run API..."
gcloud services enable run.googleapis.com --project=$PROJECT_ID
echo "✓ Cloud Run API enabled"
echo ""

# Enable Eventarc API
echo "5/5 Enabling Eventarc API..."
gcloud services enable eventarc.googleapis.com --project=$PROJECT_ID
echo "✓ Eventarc API enabled"
echo ""

echo "================================================"
echo "✓ All APIs enabled successfully!"
echo "================================================"
echo ""
echo "You can now proceed with:"
echo "  firebase login"
echo "  firebase init"
echo ""
