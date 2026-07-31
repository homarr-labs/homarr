#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for command in corepack go docker gh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  printf 'Required command not found: docker compose\n' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  printf 'Docker daemon is not available.\n' >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  printf 'GitHub CLI is not authenticated. Run `gh auth login`.\n' >&2
  exit 1
fi

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
compose_file="$repository_root/development/development.docker-compose.yml"
redis_id="$(docker compose -f "$compose_file" ps -q redis)"
if [ -n "$redis_id" ] && [ "$(docker inspect --format '{{.State.Running}}' "$redis_id")" = "true" ] && [ "$(docker compose -f "$compose_file" exec -T redis redis-cli ping)" = "PONG" ]; then
  printf 'Redis is already available on port 6379.\n'
else
  docker compose -f "$compose_file" up -d --no-recreate redis
  for _ in {1..30}; do
    if [ "$(docker compose -f "$compose_file" exec -T redis redis-cli ping 2>/dev/null)" = "PONG" ]; then
      break
    fi
    sleep 1
  done
  if [ "$(docker compose -f "$compose_file" exec -T redis redis-cli ping 2>/dev/null)" != "PONG" ]; then
    printf 'Redis did not become ready.\n' >&2
    exit 1
  fi
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

cli_command="$HOME/.local/bin/homarr"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) cli_command="homarr" ;;
  *) printf 'Add %s to PATH to run `homarr` directly.\n' "$HOME/.local/bin" ;;
esac

printf 'Development environment ready. Run `%s dev` or `pnpm dev`.\n' "$cli_command"
