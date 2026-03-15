#!/usr/bin/env bash
# Docker build + run integration test
# Tests that the Docker image builds and starts successfully on the current architecture.
# Works on both x86_64 and arm64 without requiring multi-platform builders.
#
# Usage: ./scripts/docker-test.sh [--skip-build]

set -euo pipefail

IMAGE_NAME="homarr:test"
CONTAINER_NAME="homarr-docker-test"
PORT=7575
HEALTH_ENDPOINT="/api/health/ready"
MAX_WAIT=60
POLL_INTERVAL=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo -e "${YELLOW}Cleaning up container...${NC}"
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
  fi
  docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
}

trap cleanup EXIT

# Detect architecture
ARCH=$(uname -m)
echo "🏗️  Architecture: ${ARCH}"

# Step 1: Build
if [ "${1:-}" != "--skip-build" ]; then
  echo "🔨 Building Docker image..."
  docker build -t "${IMAGE_NAME}" . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Docker build succeeded${NC}"
else
  echo "⏭️  Skipping build (--skip-build)"
fi

# Step 2: Start container
echo "🚀 Starting container..."
cleanup
docker run --rm -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:7575" \
  -e SECRET_ENCRYPTION_KEY="$(head -c 32 /dev/urandom | xxd -p | tr -d '\n')" \
  "${IMAGE_NAME}"

# Step 3: Wait for health endpoint
echo "⏳ Waiting for health endpoint (max ${MAX_WAIT}s)..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -sf "http://localhost:${PORT}${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed after ${ELAPSED}s${NC}"
    break
  fi
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Health check failed after ${MAX_WAIT}s${NC}"
  echo "--- Container logs ---"
  docker logs "${CONTAINER_NAME}" 2>&1 | tail -50
  exit 1
fi

# Step 4: Verify key endpoints
echo "🔍 Verifying endpoints..."

# Home page
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/")
if [ "$HOME_STATUS" = "200" ]; then
  echo -e "${GREEN}  ✅ Home page: ${HOME_STATUS}${NC}"
else
  echo -e "${RED}  ❌ Home page: ${HOME_STATUS}${NC}"
  docker logs "${CONTAINER_NAME}" 2>&1 | tail -30
  exit 1
fi

# Health live
LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/health/live")
if [ "$LIVE_STATUS" = "200" ]; then
  echo -e "${GREEN}  ✅ Health live: ${LIVE_STATUS}${NC}"
else
  echo -e "${RED}  ❌ Health live: ${LIVE_STATUS}${NC}"
  exit 1
fi

# Health ready
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/health/ready")
if [ "$READY_STATUS" = "200" ]; then
  echo -e "${GREEN}  ✅ Health ready: ${READY_STATUS}${NC}"
else
  echo -e "${RED}  ❌ Health ready: ${READY_STATUS}${NC}"
  exit 1
fi

# Step 5: Verify WebSocket upgrade is possible (should get 426 without proper headers, or 101 with them)
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "http://localhost:${PORT}/websockets" 2>/dev/null || echo "000")
if [ "$WS_STATUS" = "101" ] || [ "$WS_STATUS" = "426" ] || [ "$WS_STATUS" = "400" ]; then
  echo -e "${GREEN}  ✅ WebSocket endpoint reachable: ${WS_STATUS}${NC}"
else
  echo -e "${YELLOW}  ⚠️  WebSocket endpoint status: ${WS_STATUS} (may be expected behind nginx)${NC}"
fi

# Step 6: Print container info
echo ""
echo "📊 Container info:"
docker inspect "${CONTAINER_NAME}" --format='  Image: {{.Config.Image}}' 2>/dev/null || true
docker inspect "${CONTAINER_NAME}" --format='  Platform: {{.Platform}}' 2>/dev/null || true
echo "  Architecture: ${ARCH}"

echo ""
echo -e "${GREEN}✅ All Docker tests passed!${NC}"
