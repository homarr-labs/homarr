#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for command in corepack go docker gh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

if [ ! -f "$repository_root/.env" ]; then
  database_directory="$HOME/.local/share/homarr"
  database_path="$database_directory/dev.sqlite"
  mkdir -p "$database_directory"
  while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "${line/FULL_PATH_TO_YOUR_SQLITE_DB_FILE/$database_path}"
  done < "$repository_root/.env.example" > "$repository_root/.env"
fi

corepack enable pnpm
pnpm --dir "$repository_root" install
if [ -z "$(docker ps --filter publish=6379 --format '{{.ID}}')" ]; then
  docker compose -f "$repository_root/development/development.docker-compose.yml" up -d --no-recreate redis
else
  printf 'Redis is already available on port 6379.\n'
fi
pnpm --dir "$repository_root" db:migration:sqlite:run
mkdir -p "$HOME/.local/bin"
(
  cd "$repository_root/tools/homarr-dev"
  go build -trimpath -o "$HOME/.local/bin/homarr" .
)

if [ "$(uname -s)" = "Darwin" ]; then
  codesign --sign - --force "$HOME/.local/bin/homarr"
fi

if [ -d "$HOME/.config/fish/completions" ]; then
  "$HOME/.local/bin/homarr" completion fish > "$HOME/.config/fish/completions/homarr.fish"
fi

printf 'Development environment ready. Run `homarr dev` or `pnpm dev`.\n'
