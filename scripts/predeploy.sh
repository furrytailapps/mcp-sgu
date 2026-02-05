#!/bin/bash
# Pre-deploy script for mcp-sgu
# Runs all tests against a local dev server to verify the MCP is ready for deployment
#
# Usage:
#   npm run predeploy       # Run from package.json
#   ./scripts/predeploy.sh  # Run directly

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  MCP Pre-Deploy Verification"
echo "  mcp-sgu"
echo "=============================================="
echo ""

# Step 1: Typecheck
echo -e "${YELLOW}Step 1: Running typecheck...${NC}"
npm run typecheck || {
  echo -e "${RED}Typecheck failed!${NC}"
  exit 1
}
echo -e "${GREEN}Typecheck passed${NC}"
echo ""

# Step 2: Lint
echo -e "${YELLOW}Step 2: Running lint...${NC}"
npm run lint || {
  echo -e "${RED}Lint failed!${NC}"
  exit 1
}
echo -e "${GREEN}Lint passed${NC}"
echo ""

# Step 3: Start dev server in background
echo -e "${YELLOW}Step 3: Starting dev server...${NC}"

# Kill any existing dev server on port 3000
lsof -ti:3000 | xargs kill 2>/dev/null || true

# Start dev server in background, capture PID
npm run dev > /tmp/mcp-dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start (PID: $DEV_SERVER_PID)..."
MAX_WAIT=30
WAITED=0
while ! curl -s http://localhost:3000/mcp > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}Server failed to start within ${MAX_WAIT}s${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
    cat /tmp/mcp-dev-server.log
    exit 1
  fi
done
echo -e "${GREEN}Server ready${NC}"
echo ""

# Cleanup function to kill server on exit
cleanup() {
  echo ""
  echo "Stopping dev server..."
  kill $DEV_SERVER_PID 2>/dev/null || true
  wait $DEV_SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# Step 4: Run basic tests
if [ -f "tests/basic.cjs" ]; then
  echo -e "${YELLOW}Step 4: Running basic tests...${NC}"
  node tests/basic.cjs || {
    echo -e "${RED}Basic tests failed!${NC}"
    exit 1
  }
  echo -e "${GREEN}Basic tests passed${NC}"
  echo ""
fi

# Step 5: Run comprehensive tests
if [ -f "tests/comprehensive.cjs" ]; then
  echo -e "${YELLOW}Step 5: Running comprehensive tests...${NC}"
  node tests/comprehensive.cjs || {
    echo -e "${RED}Comprehensive tests failed!${NC}"
    exit 1
  }
  echo -e "${GREEN}Comprehensive tests passed${NC}"
  echo ""
fi

# Step 6: Run use-case tests
if [ -f "tests/use-cases.cjs" ]; then
  echo -e "${YELLOW}Step 6: Running use-case tests...${NC}"
  node tests/use-cases.cjs || {
    echo -e "${RED}Use-case tests failed!${NC}"
    exit 1
  }
  echo -e "${GREEN}Use-case tests passed${NC}"
  echo ""
fi

# Step 7: Run edge-case tests
if [ -f "tests/edge-cases.cjs" ]; then
  echo -e "${YELLOW}Step 7: Running edge-case tests...${NC}"
  node tests/edge-cases.cjs || {
    echo -e "${RED}Edge-case tests failed!${NC}"
    exit 1
  }
  echo -e "${GREEN}Edge-case tests passed${NC}"
  echo ""
fi

echo "=============================================="
echo -e "${GREEN}  All pre-deploy checks passed!${NC}"
echo "  Safe to deploy to production."
echo "=============================================="
