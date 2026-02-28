#!/usr/bin/env bash
# Benchmark memory usage of the WebSocket server approach
# Usage: ./scripts/benchmark-memory.sh [approach]
# approach: "separate" (current: separate ws server) or "integrated" (custom Next.js server)

set -e

APPROACH="${1:-separate}"
WAIT_SECONDS="${2:-10}"

echo "============================================"
echo "Memory Benchmark: $APPROACH approach"
echo "============================================"
echo ""

measure_memory() {
  local pid=$1
  local label=$2
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    local rss
    rss=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$rss" ]; then
      local rss_mb
      rss_mb=$(echo "scale=2; $rss / 1024" | bc)
      echo "$label (PID $pid): ${rss_mb} MB (RSS: ${rss} KB)"
      echo "$rss"
    else
      echo "$label (PID $pid): unable to read memory"
      echo "0"
    fi
  else
    echo "$label: not running"
    echo "0"
  fi
}

cleanup() {
  echo ""
  echo "Cleaning up processes..."
  for pid in "${PIDS[@]}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  echo "Done."
}

trap cleanup EXIT

PIDS=()
TOTAL_RSS=0

if [ "$APPROACH" = "separate" ]; then
  echo "Starting separate WebSocket server (current approach)..."
  echo "---"

  # Start the WebSocket server
  node apps/websocket/wssServer.cjs &
  WSS_PID=$!
  PIDS+=("$WSS_PID")

  # Start the Next.js server
  node apps/nextjs/server.js &
  NEXTJS_PID=$!
  PIDS+=("$NEXTJS_PID")

  echo "Waiting ${WAIT_SECONDS}s for processes to stabilize..."
  sleep "$WAIT_SECONDS"

  echo ""
  echo "--- Memory Usage (Separate Approach) ---"
  wss_mem=$(measure_memory "$WSS_PID" "WebSocket Server" | tail -1)
  nextjs_mem=$(measure_memory "$NEXTJS_PID" "Next.js Server" | tail -1)

  TOTAL_RSS=$((wss_mem + nextjs_mem))
  TOTAL_MB=$(echo "scale=2; $TOTAL_RSS / 1024" | bc)

  echo ""
  echo "TOTAL: ${TOTAL_MB} MB (RSS: ${TOTAL_RSS} KB)"

elif [ "$APPROACH" = "integrated" ]; then
  echo "Starting integrated custom Next.js server (new approach)..."
  echo "---"

  # Start the custom server (Next.js + WebSocket integrated)
  node apps/nextjs/customServer.cjs &
  CUSTOM_PID=$!
  PIDS+=("$CUSTOM_PID")

  echo "Waiting ${WAIT_SECONDS}s for process to stabilize..."
  sleep "$WAIT_SECONDS"

  echo ""
  echo "--- Memory Usage (Integrated Approach) ---"
  custom_mem=$(measure_memory "$CUSTOM_PID" "Custom Server (Next.js + WS)" | tail -1)

  TOTAL_RSS=$custom_mem
  TOTAL_MB=$(echo "scale=2; $TOTAL_RSS / 1024" | bc)

  echo ""
  echo "TOTAL: ${TOTAL_MB} MB (RSS: ${TOTAL_RSS} KB)"

else
  echo "Unknown approach: $APPROACH"
  echo "Usage: $0 [separate|integrated] [wait_seconds]"
  exit 1
fi

echo ""
echo "============================================"
echo "Benchmark complete for: $APPROACH"
echo "Total memory: ${TOTAL_MB} MB"
echo "============================================"
