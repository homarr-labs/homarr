#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$repo_dir"

preview_name=${DOCS_PREVIEW_NAME:-homarr-docs-static-preview}
preview_host=${DOCS_PREVIEW_HOST:-127.0.0.1}
preview_port=${DOCS_PREVIEW_PORT:-8093}
preview_image=homarr-workshop:docs-static-preview
preview_url="http://$preview_host:$preview_port"
api_url=${WORKSHOP_API_URL:-$preview_url}
api_url=${api_url%/}
api_url=${api_url%/api}
remote_api_url=${WORKSHOP_REMOTE_API_URL:-${WORKSHOP_API_URL:-}}
remote_api_url=${remote_api_url%/}
remote_api_url=${remote_api_url%/api}

if [ ! -f apps/docs/out/404.html ]; then
  echo 'Build the docs first: pnpm --filter @homarr/docs build' >&2
  exit 1
fi

docker build --target development -f apps/workshop/Dockerfile -t "$preview_image" .
docker run --detach --rm --name "$preview_name" \
  --user "$(id -u):$(id -g)" \
  --publish "$preview_host:$preview_port:8090" \
  --mount "type=bind,src=$repo_dir/apps/docs/out,dst=/pb_public" \
  --mount "type=bind,src=$repo_dir/apps/workshop/pb_hooks,dst=/pb_hooks,readonly" \
  --mount "type=bind,src=$repo_dir/apps/workshop/pb_migrations,dst=/pb_migrations,readonly" \
  --tmpfs "/pb_data:uid=$(id -u),gid=$(id -g)" \
  --env "HOMARR_WEBSITE_URL=$preview_url" \
  --env "WORKSHOP_API_URL=$api_url" \
  --env "WORKSHOP_REMOTE_API_URL=$remote_api_url" \
  --env "WORKSHOP_WEB_URL=$preview_url/workshop" \
  "$preview_image"

attempt=0
until docker exec "$preview_name" wget -q --spider http://127.0.0.1:8090/api/health >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Preview did not become healthy. Inspect it with: docker logs $preview_name" >&2
    exit 1
  fi
  sleep 1
done

printf 'Static docs: %s/docs/\nWorkshop API: %s\nStop: docker stop %s\n' "$preview_url" "$api_url" "$preview_name"
