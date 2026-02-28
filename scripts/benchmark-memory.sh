#!/usr/bin/env bash
# Benchmark memory usage: separate ws server vs integrated custom Next.js server
# Usage: ./scripts/benchmark-memory.sh [approach] [wait_seconds]
# approach: "separate" | "integrated" | "both" (default: both)

set -e

APPROACH="${1:-both}"
WAIT_SECONDS="${2:-15}"

measure_process_tree_memory() {
  local root_pid=$1
  local label=$2
  local total_rss=0

  if [ -z "$root_pid" ] || ! kill -0 "$root_pid" 2>/dev/null; then
    echo "$label: not running"
    return
  fi

  # Measure root process
  local root_rss
  root_rss=$(grep VmRSS /proc/$root_pid/status 2>/dev/null | awk '{print $2}')
  root_rss=${root_rss:-0}
  total_rss=$root_rss
  local root_mb
  root_mb=$(echo "scale=2; $root_rss / 1024" | bc)
  echo "  $label (PID $root_pid): ${root_mb} MB"

  # Measure child processes recursively
  for cpid in $(pgrep -P "$root_pid" 2>/dev/null); do
    if kill -0 "$cpid" 2>/dev/null; then
      local child_rss
      child_rss=$(grep VmRSS /proc/$cpid/status 2>/dev/null | awk '{print $2}')
      child_rss=${child_rss:-0}
      total_rss=$((total_rss + child_rss))
      local child_mb
      child_mb=$(echo "scale=2; $child_rss / 1024" | bc)
      local child_cmd
      child_cmd=$(cat /proc/$cpid/cmdline 2>/dev/null | tr '\0' ' ' | head -c 60)
      echo "    Child (PID $cpid): ${child_mb} MB - $child_cmd"

      # Grandchildren
      for gpid in $(pgrep -P "$cpid" 2>/dev/null); do
        if kill -0 "$gpid" 2>/dev/null; then
          local gchild_rss
          gchild_rss=$(grep VmRSS /proc/$gpid/status 2>/dev/null | awk '{print $2}')
          gchild_rss=${gchild_rss:-0}
          total_rss=$((total_rss + gchild_rss))
          local gchild_mb
          gchild_mb=$(echo "scale=2; $gchild_rss / 1024" | bc)
          local gchild_cmd
          gchild_cmd=$(cat /proc/$gpid/cmdline 2>/dev/null | tr '\0' ' ' | head -c 60)
          echo "      Grandchild (PID $gpid): ${gchild_mb} MB - $gchild_cmd"
        fi
      done
    fi
  done

  local total_mb
  total_mb=$(echo "scale=2; $total_rss / 1024" | bc)
  echo "  Subtotal: ${total_mb} MB"
  # Export for caller
  eval "${label}_TOTAL_RSS=$total_rss"
}

cleanup_pids() {
  for pid in "$@"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}

run_separate() {
  echo "============================================"
  echo "SEPARATE APPROACH (Current: WS + Next.js)"
  echo "============================================"

  # Start WS server
  node apps/websocket/wssServer.cjs &
  WS_PID=$!
  sleep 5

  WS_LISTEN_PID=$(lsof -i :3001 -t 2>/dev/null | head -1)
  echo "WS server listening PID: $WS_LISTEN_PID"

  WS_RSS=$(grep VmRSS /proc/${WS_LISTEN_PID}/status 2>/dev/null | awk '{print $2}')
  WS_RSS=${WS_RSS:-0}
  WS_MB=$(echo "scale=2; $WS_RSS / 1024" | bc)
  echo "  WebSocket Server: ${WS_MB} MB"

  echo ""
  echo "TOTAL (Separate WS only): ${WS_MB} MB"
  echo "Note: Next.js dev server not included (would add ~1.5-2.5 GB)"
  echo "============================================"

  cleanup_pids "$WS_PID"
  SEPARATE_RSS=$WS_RSS
}

run_integrated() {
  echo "============================================"
  echo "INTEGRATED APPROACH (Custom Next.js Server)"
  echo "============================================"

  cd apps/nextjs
  node customServer.cjs &
  CUSTOM_PID=$!
  cd ../..

  echo "Waiting ${WAIT_SECONDS}s for server to stabilize..."
  sleep "$WAIT_SECONDS"

  measure_process_tree_memory "$CUSTOM_PID" "CustomServer"
  echo ""
  INTEGRATED_RSS=${CustomServer_TOTAL_RSS:-0}
  INTEGRATED_MB=$(echo "scale=2; $INTEGRATED_RSS / 1024" | bc)
  echo "TOTAL (Integrated): ${INTEGRATED_MB} MB"
  echo "============================================"

  cleanup_pids "$CUSTOM_PID"
}

if [ "$APPROACH" = "separate" ] || [ "$APPROACH" = "both" ]; then
  run_separate
  echo ""
fi

if [ "$APPROACH" = "integrated" ] || [ "$APPROACH" = "both" ]; then
  # Clean up lock from previous run
  rm -rf apps/nextjs/.next/dev/lock
  run_integrated
  echo ""
fi

if [ "$APPROACH" = "both" ]; then
  echo "============================================"
  echo "COMPARISON"
  echo "============================================"
  SEP_MB=$(echo "scale=2; ${SEPARATE_RSS:-0} / 1024" | bc)
  INT_MB=$(echo "scale=2; ${INTEGRATED_RSS:-0} / 1024" | bc)
  echo "Separate WS server only:  ${SEP_MB} MB"
  echo "Integrated custom server: ${INT_MB} MB"
  echo "(The integrated server includes both Next.js AND WebSocket)"
  echo "============================================"
fi
