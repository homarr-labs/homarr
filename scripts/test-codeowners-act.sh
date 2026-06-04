#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Local CODEOWNERS checks"
pnpm exec tsx ./scripts/generate-codeowners.mts --check
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-homarr-labs/homarr}"
if [ -z "${GITHUB_TOKEN:-}" ] && [ -z "${GH_TOKEN:-}" ]; then
  GITHUB_TOKEN="$(gh auth token 2>/dev/null || true)"
  export GITHUB_TOKEN
fi
pnpm exec tsx ./scripts/validate-codeowners.mts

echo "==> act: validate job (requires Docker)"
act workflow_dispatch -W .github/workflows/update-codeowners.yml -j validate \
  -s GITHUB_TOKEN="${GITHUB_TOKEN:-}"
