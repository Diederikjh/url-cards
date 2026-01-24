#!/bin/bash
# Helper script to run E2E tests with all required services
# This script starts Firebase Emulator, Hosting Server, and runs tests

set -e

echo "🚀 Starting E2E test environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
  trap - EXIT
  echo ""
  echo "${YELLOW}Cleaning up...${NC}"
  # Kill background processes
  jobs -p | xargs -r kill 2>/dev/null || true
  exit $1
}

trap "cleanup 1" EXIT

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
  echo "${RED}❌ Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
  exit 1
fi

# Kill any existing processes on the ports we need
echo "Checking for port conflicts..."
for port in 8080 9099 5000; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "${YELLOW}⚠️  Port $port is in use. Killing existing process...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done

echo ""
echo "${GREEN}✓ Starting Firebase Emulators (Firestore, Auth, Hosting)...${NC}"
firebase emulators:start --only firestore,auth,hosting &
EMULATOR_PID=$!
echo "Waiting for Emulators to start..."
TIMEOUT=60
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  if (( CURRENT_TIME - START_TIME > TIMEOUT )); then
    echo "${RED}❌ Emulators failed to start after $TIMEOUT seconds${NC}"
    exit 1
  fi

  if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null && \
     lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null && \
     lsof -Pi :9099 -sTCP:LISTEN -t >/dev/null; then
    echo "${GREEN}✓ Emulators are ready!${NC}"
    break
  fi
  sleep 1
done

echo ""
echo "${GREEN}✓ Services started, running tests...${NC}"
echo ""

echo ""
echo ""
echo "${GREEN}✓ Running E2E tests...${NC}"
FIRESTORE_EMULATOR_HOST=localhost:8080 \
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
npm run test:e2e -- "$@"

EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "${GREEN}✓ Tests passed!${NC}"
else
  echo "${RED}❌ Tests failed${NC}"
fi

cleanup $EXIT_CODE
