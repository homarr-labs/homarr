#!/bin/sh
set -eu

directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository=$(CDPATH= cd -- "$directory/../.." && pwd)
action=up
name=default
port=''
public_url=''
worker_image=${HOMARR_DEMO_WORKER_IMAGE:-}
platform_image=${HOMARR_DEMO_PLATFORM_IMAGE:-}
relay_image=${HOMARR_DEMO_RELAY_IMAGE:-}
gateway_image=${HOMARR_DEMO_GATEWAY_IMAGE:-}
confirmed=false

usage() {
    cat <<'HELP'
Usage: ./deployments/demo/demo.sh [up|status|pair|down|reset] [options]

  up                         Start the isolated, seeded demo (default command).
  status                     Show demo containers and addresses.
  pair                       Print the private first-launch connection link.
  down                       Stop the demo, keeping its data and keys.
  reset --yes                Delete only this demo's containers and data volumes.

  --port PORT                Local gateway port (default 43100).
  --public-url https://HOST  Use an existing HTTPS proxy to the local gateway.
  --name NAME                Separate demo instance (default "default").

Examples:
  ./deployments/demo/demo.sh
  ./deployments/demo/demo.sh up --public-url https://your-tailnet-host:8443
  ./deployments/demo/demo.sh down

Only Docker with Compose v2 is required. Missing Homarr images build locally.
HELP
}

fail() { printf '%s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
    case "$1" in
        up|status|pair|down|reset) action=$1; shift ;;
        --port) [ "$#" -ge 2 ] || fail '--port requires a value'; port=$2; shift 2 ;;
        --public-url) [ "$#" -ge 2 ] || fail '--public-url requires a value'; public_url=$2; shift 2 ;;
        --name) [ "$#" -ge 2 ] || fail '--name requires a value'; name=$2; shift 2 ;;
        --yes) confirmed=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; fail "Unknown argument: $1" ;;
    esac
done

case "$name" in ''|*[!a-z0-9-]*|-*) fail 'Demo name must contain lowercase letters, digits, and hyphens.' ;; esac
[ "${#name}" -le 40 ] || fail 'Demo name is too long.'
project="homarr-remote-demo-$name"
state="$directory/.state/$name"
config="$state/config.env"

command -v docker >/dev/null 2>&1 || fail 'Docker is required.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'
docker info >/dev/null 2>&1 || fail 'Docker is not running or is not accessible.'

setting() { sed -n "s/^$1=//p" "$config" | tail -n 1; }

if [ "$action" = up ]; then
    mkdir -p "$state"
    if [ -f "$config" ]; then
        if [ -z "$port" ]; then port=$(setting HOMARR_DEMO_PORT); fi
        if [ -z "$public_url" ]; then public_url=$(setting DEMO_PUBLIC_URL); fi
        if [ -z "$worker_image" ]; then worker_image=$(setting HOMARR_DEMO_WORKER_IMAGE); fi
        if [ -z "$platform_image" ]; then platform_image=$(setting HOMARR_DEMO_PLATFORM_IMAGE); fi
        if [ -z "$relay_image" ]; then relay_image=$(setting HOMARR_DEMO_RELAY_IMAGE); fi
        if [ -z "$gateway_image" ]; then gateway_image=$(setting HOMARR_DEMO_GATEWAY_IMAGE); fi
    fi
    worker_image=${worker_image:-homarr:worker-demo-local}
    platform_image=${platform_image:-homarr:remote-demo-local}
    relay_image=${relay_image:-homarr:relay-v2}
    gateway_image=${gateway_image:-nginx:1.30.6-alpine}
    for image in "$worker_image" "$platform_image" "$relay_image" "$gateway_image"; do
        case "$image" in ''|*[!A-Za-z0-9_./:@-]*) fail 'Invalid Docker image name.' ;; esac
    done
    port=${port:-43100}
    case "$port" in ''|*[!0-9]*) fail 'Port must be a number.' ;; esac
    [ "$port" -ge 1024 ] && [ "$port" -le 65535 ] || fail 'Port must be between 1024 and 65535.'
    public_url=${public_url:-http://localhost:$port}
    public_url=${public_url%/}
    case "$public_url" in
        https://*) authority=${public_url#https://}; relay_url="wss://$authority" ;;
        http://localhost:"$port"|http://127.0.0.1:"$port") authority=${public_url#http://}; relay_url="ws://$authority" ;;
        *) fail 'Use loopback HTTP with the gateway port, or a public HTTPS origin.' ;;
    esac
    case "$authority" in ''|*[!A-Za-z0-9.:-]*|*/*|*@*) fail 'Public URL must be an origin without credentials, path, query, or fragment.' ;; esac
    case "$public_url" in *localhost*|*127.0.0.1*)
        case "$public_url" in http://*) ;; *) fail 'For the local demo use plain HTTP, or provide an external HTTPS hostname.' ;; esac
    esac
    umask 077
    printf 'HOMARR_DEMO_PORT=%s\nDEMO_PUBLIC_URL=%s\nDEMO_RELAY_URL=%s\nHOMARR_DEMO_WORKER_IMAGE=%s\nHOMARR_DEMO_PLATFORM_IMAGE=%s\nHOMARR_DEMO_RELAY_IMAGE=%s\nHOMARR_DEMO_GATEWAY_IMAGE=%s\n' "$port" "$public_url" "$relay_url" "$worker_image" "$platform_image" "$relay_image" "$gateway_image" > "$config"
elif [ ! -f "$config" ]; then
    printf 'This demo has not been started. Run %s up first.\n' "$0"
    exit 0
fi

compose() { docker compose --project-name "$project" --env-file "$config" -f "$directory/compose.yml" "$@"; }

ensure_image() {
    image=$1
    build_type=$2
    if docker image inspect "$image" >/dev/null 2>&1; then return; fi
    printf 'Preparing missing image %s...\n' "$image"
    case "$build_type" in
        worker) docker build --target worker -t "$image" "$repository" ;;
        platform) docker build -f "$repository/Dockerfile.remote" --target remote-platform -t "$image" "$repository" ;;
        relay) docker build -f "$repository/apps/relay/Dockerfile" -t "$image" "$repository" ;;
        gateway) docker pull "$image" ;;
    esac
}

pair() {
    compose exec -T worker bun -e '
      const pairing=await Bun.file("/appdata/worker/pairing.json").json();
      if(pairing.claimed){
        console.log("This demo is already claimed. Open it in the original browser, or use an owner invitation from that browser.");
        console.log("For a fresh isolated demo, choose another --name. Resetting this demo deletes its data and keys.");
      }else{
        console.log("Open this private link, then choose Connect worker. No account login is required:");
        console.log(pairing.url);
      }'
}

case "$action" in
    up)
        ensure_image "$worker_image" worker
        ensure_image "$platform_image" platform
        ensure_image "$relay_image" relay
        ensure_image "$gateway_image" gateway
        compose up -d --wait --wait-timeout 180
        compose exec -T --user 1000 worker bun /demo/prepare-demo.ts
        printf '\nDemo: %s/remote/\n' "$public_url"
        printf 'The dashboard data is seeded locally; GitHub login is optional.\n\n'
        pair
        ;;
    status)
        compose ps
        printf '\nDemo: %s/remote/\n' "$(setting DEMO_PUBLIC_URL)"
        ;;
    pair) pair ;;
    down)
        compose down
        printf 'Demo stopped. Its data and encryption keys are preserved.\n'
        ;;
    reset)
        [ "$confirmed" = true ] || fail "Reset deletes only $project demo data and keys. Run reset --yes to confirm."
        compose down --volumes
        printf 'Deleted %s demo data. Other Homarr data and Docker projects were not changed.\n' "$project"
        ;;
esac
