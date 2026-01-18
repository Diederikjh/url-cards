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
echo "${GREEN}✓ Starting Firebase Emulator...${NC}"
firebase emulators:start --only firestore,auth &
EMULATOR_PID=$!
sleep 3

echo ""
echo "${GREEN}✓ Starting Firebase Hosting server...${NC}"
npm run serve:test > /tmp/firebase-serve.log 2>&1 &
HOSTING_PID=$!
sleep 3

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8080/ >/dev/null 2>&1 && curl -s http://localhost:5000/ >/dev/null 2>&1; then
    echo "${GREEN}✓ All services ready!${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo ""
echo "${GREEN}✓ Running E2E tests...${NC}"
npm run test:e2e

EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "${GREEN}✓ Tests passed!${NC}"
else
  echo "${RED}❌ Tests failed${NC}"
fi

cleanup $EXIT_CODE
