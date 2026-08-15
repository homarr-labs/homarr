#!/usr/bin/env bash
set -euo pipefail

# Installs homarr in a paseo worktree:
# 1. installs pinned tools via mise
# 2. installs dependencies via pnpm
# 3. creates a .env pointing at a local sqlite database in the current directory
# 4. runs the sqlite migrations

mise trust
mise install
pnpm install

if [ -n "${PASEO_SOURCE_CHECKOUT_PATH:-}" ] && [ -f "$PASEO_SOURCE_CHECKOUT_PATH/.env" ]; then
  cp "$PASEO_SOURCE_CHECKOUT_PATH/.env" .env
else
  cp .env.example .env
fi

DB_PATH="$PWD/homarr.sqlite"
if grep -q '^DB_DRIVER=' .env; then
  sed -i.bak "s|^DB_DRIVER=.*|DB_DRIVER='better-sqlite3'|" .env
else
  printf "DB_DRIVER='better-sqlite3'\n" >> .env
fi
if grep -q '^DB_URL=' .env; then
  sed -i.bak "s|^DB_URL=.*|DB_URL='$DB_PATH'|" .env
else
  printf "DB_URL='%s'\n" "$DB_PATH" >> .env
fi
rm -f .env.bak

rm -f homarr.sqlite
pnpm db:migration:sqlite:run
