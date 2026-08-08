#!/usr/bin/env bash
# Compares Next.js build output between origin/dev and the current branch.
# Runs two full builds — expect ~5-10 minutes total.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NEXT_DIR="$REPO_ROOT/apps/nextjs"
OUT_DIR="$REPO_ROOT/.bench"
mkdir -p "$OUT_DIR"

capture_metrics() {
  local label="$1" out="$OUT_DIR/$label"
  mkdir -p "$out"

  echo "=== Building $label ==="
  cd "$REPO_ROOT"

  local start_ns
  start_ns=$(date +%s)
  pnpm turbo build --filter=@homarr/nextjs 2>&1 | tee "$out/build.log"
  local end_ns
  end_ns=$(date +%s)
  echo $((end_ns - start_ns)) > "$out/build_time_s"

  # .next size
  du -sh "$NEXT_DIR/.next" 2>/dev/null | cut -f1 > "$out/next_size"

  # Standalone size
  if [ -d "$NEXT_DIR/.next/standalone" ]; then
    du -sh "$NEXT_DIR/.next/standalone" | cut -f1 > "$out/standalone_size"
  else
    echo "n/a" > "$out/standalone_size"
  fi

  # Prerendered routes
  if [ -d "$NEXT_DIR/.next/server/app" ]; then
    find "$NEXT_DIR/.next/server/app" -name '*.html' | wc -l | tr -d ' ' > "$out/prerendered_count"
  else
    echo "0" > "$out/prerendered_count"
  fi

  # Route summary from build output
  grep -E '(○|●|λ|ƒ|◐)\s' "$out/build.log" > "$out/routes.txt" 2>/dev/null || true
  grep -c '^○' "$out/routes.txt" 2>/dev/null > "$out/static_routes" || echo "0" > "$out/static_routes"
  grep -c '^ƒ\|^λ\|^●\|^◐' "$out/routes.txt" 2>/dev/null > "$out/dynamic_routes" || echo "0" > "$out/dynamic_routes"
}

echo "Stashing uncommitted changes..."
git stash --include-untracked -q 2>/dev/null || true

echo ""
echo "=== Phase 1: Build origin/dev ==="
git checkout origin/dev --detach -q
capture_metrics "dev"

echo ""
echo "=== Phase 2: Build $CURRENT_BRANCH ==="
git checkout "$CURRENT_BRANCH" -q
git stash pop -q 2>/dev/null || true
capture_metrics "branch"

echo ""
echo "========================================"
echo "          BUILD COMPARISON"
echo "========================================"
printf "%-25s %-15s %-15s\n" "Metric" "dev" "$CURRENT_BRANCH"
printf "%-25s %-15s %-15s\n" "-------------------------" "---------------" "---------------"
printf "%-25s %-15s %-15s\n" "Build time (s)" "$(cat "$OUT_DIR/dev/build_time_s")" "$(cat "$OUT_DIR/branch/build_time_s")"
printf "%-25s %-15s %-15s\n" ".next size" "$(cat "$OUT_DIR/dev/next_size")" "$(cat "$OUT_DIR/branch/next_size")"
printf "%-25s %-15s %-15s\n" "Standalone size" "$(cat "$OUT_DIR/dev/standalone_size")" "$(cat "$OUT_DIR/branch/standalone_size")"
printf "%-25s %-15s %-15s\n" "Prerendered HTML files" "$(cat "$OUT_DIR/dev/prerendered_count")" "$(cat "$OUT_DIR/branch/prerendered_count")"
printf "%-25s %-15s %-15s\n" "Static routes" "$(cat "$OUT_DIR/dev/static_routes")" "$(cat "$OUT_DIR/branch/static_routes")"
printf "%-25s %-15s %-15s\n" "Dynamic routes" "$(cat "$OUT_DIR/dev/dynamic_routes")" "$(cat "$OUT_DIR/branch/dynamic_routes")"
echo "========================================"
echo ""
echo "Detailed logs in $OUT_DIR/{dev,branch}/build.log"
