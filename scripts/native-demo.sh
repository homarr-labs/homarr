#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository=$(CDPATH= cd -- "$script_directory/.." && pwd)
directory="$repository/deployments/native"
action=up
name=default
worker=primary
port=''
public_url=''
rebuild=false
frontend_image=${HOMARR_NATIVE_FRONTEND_IMAGE:-}
platform_image=${HOMARR_NATIVE_PLATFORM_IMAGE:-}
worker_image=${HOMARR_NATIVE_WORKER_IMAGE:-}
relay_image=${HOMARR_NATIVE_RELAY_IMAGE:-}
gateway_image=${HOMARR_NATIVE_GATEWAY_IMAGE:-}

usage() {
    cat <<'HELP'
Usage: bash scripts/native-demo.sh [up|build|status|pair|down] [options]

  up                         Start Homarr with one main worker.
  build                      Build the current source without starting it.
  status                     Show this demo's containers and address.
  pair [primary]             Print the main worker's private setup link.
  down                       Stop this demo; preserve its data and keys.

  --public-url https://HOST   Public HTTPS origin of an existing reverse proxy.
  --port PORT                Loopback gateway port (default 43105).
  --name NAME                Independent demo instance (default "default").
  --build                    Rebuild images when starting an existing demo.

Examples:
  bash scripts/native-demo.sh up
  bash scripts/native-demo.sh pair primary
  bash scripts/native-demo.sh up --public-url https://your-host:8445

Docker and Compose v2 are required. Missing Homarr images build locally.
HELP
}

fail() { printf '%s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
    case "$1" in
        up|build|status|pair|down) action=$1; shift ;;
        primary|integrations) worker=$1; shift ;;
        --public-url) [ "$#" -ge 2 ] || fail '--public-url requires a value'; public_url=$2; shift 2 ;;
        --port) [ "$#" -ge 2 ] || fail '--port requires a value'; port=$2; shift 2 ;;
        --name) [ "$#" -ge 2 ] || fail '--name requires a value'; name=$2; shift 2 ;;
        --build) rebuild=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; fail "Unknown argument: $1" ;;
    esac
done

[ "$worker" = primary ] || fail 'The integrations worker has been removed. Use pair primary for the main worker.'

case "$name" in ''|*[!a-z0-9-]*|-*) fail 'Name must contain lowercase letters, digits, and hyphens.' ;; esac
[ "${#name}" -le 40 ] || fail 'Name is too long.'
project="homarr-native-demo-$name"
state="$directory/.state/$name"
config="$state/config.env"

command -v docker >/dev/null 2>&1 || fail 'Docker is required.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'
docker info >/dev/null 2>&1 || fail 'Docker is not running or is not accessible.'

setting() { sed -n "s/^$1=//p" "$config" | tail -n 1; }

case "$action" in
    up|build)
        mkdir -p "$state"
        if [ -f "$config" ]; then
            if [ -z "$port" ]; then port=$(setting HOMARR_NATIVE_PORT); fi
            if [ -z "$public_url" ]; then public_url=$(setting HOMARR_PUBLIC_URL); fi
            if [ -z "$frontend_image" ]; then frontend_image=$(setting HOMARR_NATIVE_FRONTEND_IMAGE); fi
            if [ -z "$platform_image" ]; then platform_image=$(setting HOMARR_NATIVE_PLATFORM_IMAGE); fi
            if [ -z "$worker_image" ]; then worker_image=$(setting HOMARR_NATIVE_WORKER_IMAGE); fi
            if [ -z "$relay_image" ]; then relay_image=$(setting HOMARR_NATIVE_RELAY_IMAGE); fi
            if [ -z "$gateway_image" ]; then gateway_image=$(setting HOMARR_NATIVE_GATEWAY_IMAGE); fi
        fi
        frontend_image=${frontend_image:-homarr:native-frontend-local}
        platform_image=${platform_image:-homarr:native-platform-local}
        worker_image=${worker_image:-homarr:native-worker-local}
        relay_image=${relay_image:-homarr:native-relay-local}
        gateway_image=${gateway_image:-nginx:1.30.6-alpine}
        for image in "$frontend_image" "$platform_image" "$worker_image" "$relay_image" "$gateway_image"; do
            case "$image" in ''|*[!A-Za-z0-9_./:@-]*) fail 'Invalid Docker image name.' ;; esac
        done
        port=${port:-43105}
        case "$port" in ''|*[!0-9]*) fail 'Port must be a number.' ;; esac
        [ "$port" -ge 1024 ] && [ "$port" -le 65535 ] || fail 'Port must be between 1024 and 65535.'
        public_url=${public_url:-http://localhost:$port}
        public_url=${public_url%/}
        case "$public_url" in
            https://*) authority=${public_url#https://}; relay_url="wss://$authority/relay" ;;
            http://localhost:"$port"|http://127.0.0.1:"$port") authority=${public_url#http://}; relay_url="ws://$authority/relay" ;;
            *) fail 'Use loopback HTTP with the gateway port, or an HTTPS origin.' ;;
        esac
        case "$authority" in ''|*[!A-Za-z0-9.:-]*|*/*|*@*) fail 'Public URL must be an origin without credentials, path, query, or fragment.' ;; esac
        umask 077
        printf 'HOMARR_NATIVE_PORT=%s\nHOMARR_PUBLIC_URL=%s\nHOMARR_PUBLIC_RELAY_URL=%s\nHOMARR_NATIVE_FRONTEND_IMAGE=%s\nHOMARR_NATIVE_PLATFORM_IMAGE=%s\nHOMARR_NATIVE_WORKER_IMAGE=%s\nHOMARR_NATIVE_RELAY_IMAGE=%s\nHOMARR_NATIVE_GATEWAY_IMAGE=%s\n' \
            "$port" "$public_url" "$relay_url" "$frontend_image" "$platform_image" "$worker_image" "$relay_image" "$gateway_image" > "$config"
        ;;
    *)
        if [ ! -f "$config" ]; then
            printf 'This demo has not been started. Run bash scripts/native-demo.sh up first.\n'
            exit 0
        fi
        ;;
esac

compose() {
    docker compose --project-name "$project" --env-file "$config" \
        -f "$directory/compose.yml" -f "$directory/demo.yml" "$@"
}

build_images() {
    compose build frontend platform relay worker-primary
}

ensure_images() {
    if [ "$rebuild" = true ]; then
        build_images
    else
        for service in frontend platform relay worker-primary; do
            case "$service" in
                frontend) image=$frontend_image ;;
                platform) image=$platform_image ;;
                relay) image=$relay_image ;;
                worker-primary) image=$worker_image ;;
            esac
            if ! docker image inspect "$image" >/dev/null 2>&1; then
                compose build "$service"
            fi
        done
    fi
    if ! docker image inspect "$gateway_image" >/dev/null 2>&1; then
        docker pull "$gateway_image"
    fi
}

pair() {
    compose exec -T "worker-$worker" bun -e '
        const pairing=await Bun.file("/appdata/worker/pairing.json").json();
        if(pairing.claimed){
            console.log("Already paired. Open this worker from your saved connections, or use an owner invitation.");
            process.exit(0);
        }
        const url=new URL(pairing.url);
        const fragment=new URLSearchParams(url.hash.slice(1));
        fragment.set("direct",process.env.WORKER_PUBLIC_URL);
        fragment.set("name",process.env.WORKER_NAME);
        url.hash=fragment.toString();
        console.log("Open this private setup link in your browser:");
        console.log(url.href);
    '
}

case "$action" in
    build) build_images ;;
    up)
        ensure_images
        compose up -d --wait --wait-timeout 240
        printf '\nOpen Homarr: %s/\n' "$public_url"
        printf 'Get your worker setup link: bash scripts/native-demo.sh pair primary --name %s\n' "$name"
        ;;
    status)
        compose ps
        printf '\nHomarr: %s/\n' "$(setting HOMARR_PUBLIC_URL)"
        ;;
    pair) pair ;;
    down)
        compose down
        printf 'Native demo stopped. Its dashboards, worker keys and broker state are preserved.\n'
        ;;
esac
