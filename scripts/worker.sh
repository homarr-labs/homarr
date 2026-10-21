#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository=$(CDPATH= cd -- "$script_directory/.." && pwd)
directory="$repository/deployments/worker"
action=up
name=default
frontend=''
relay=''
image=${HOMARR_WORKER_IMAGE:-}
registration_changed=false

usage() {
    cat <<'HELP'
Usage: bash scripts/worker.sh [up|status|pair|down] [options]

  up                    Start one worker and print its private initial setup link.
  status                Show this worker's container (no private setup link).
  pair                  Print an unclaimed worker's private setup link.
  down                  Stop this worker; preserve its data and identity.

  --frontend https://HOST  Existing frontend origin (required on first start).
  --relay wss://HOST/PATH  Reachable relay; defaults to frontend origin + /relay.
  --image IMAGE           Local worker image (default homarr:native-worker-local).
  --name NAME             Independent instance (default "default").

Example:
  bash scripts/worker.sh up --frontend https://your-host:8445 --image homarr:native-worker-local

Docker and Compose v2 are required. No ports are published and no images are built
or pulled. For a protected relay, set WORKER_RELAY_REGISTRATION_TOKEN in your
environment before up; it is stored in a private file and mounted as a secret.
HELP
}

fail() { printf '%s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
    case "$1" in
        up|status|pair|down) action=$1; shift ;;
        --frontend) [ "$#" -ge 2 ] || fail '--frontend requires a value'; frontend=$2; shift 2 ;;
        --relay) [ "$#" -ge 2 ] || fail '--relay requires a value'; relay=$2; shift 2 ;;
        --image) [ "$#" -ge 2 ] || fail '--image requires a value'; image=$2; shift 2 ;;
        --name) [ "$#" -ge 2 ] || fail '--name requires a value'; name=$2; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; fail "Unknown argument: $1" ;;
    esac
done

case "$name" in ''|*[!a-z0-9-]*|-*) fail 'Name must contain lowercase letters, digits, and hyphens.' ;; esac
[ "${#name}" -le 40 ] || fail 'Name is too long.'
project="homarr-worker-$name"
state="$directory/.state/$name"
config="$state/config.env"

command -v docker >/dev/null 2>&1 || fail 'Docker is required.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'
docker info >/dev/null 2>&1 || fail 'Docker is not running or is not accessible.'

# Read dotenv values as data; never execute a saved configuration.
setting() { sed -n "s/^$1=//p" "$config" | tail -n 1; }

if [ "$action" = up ]; then
    if [ -f "$config" ]; then
        if [ -z "$frontend" ]; then
            frontend=$(setting WORKER_ALLOWED_ORIGINS)
            if [ -z "$relay" ]; then relay=$(setting WORKER_RELAY_URL); fi
        fi
        if [ -z "$image" ]; then image=$(setting HOMARR_WORKER_IMAGE); fi
    fi
    [ -n "$frontend" ] || fail 'Set --frontend to the HTTPS origin of your existing frontend.'
    frontend=${frontend%/}
    case "$frontend" in
        https://*) authority=${frontend#https://}; relay_scheme=wss ;;
        http://localhost:*|http://127.0.0.1:*) authority=${frontend#http://}; relay_scheme=ws ;;
        *) fail 'Frontend must use HTTPS (HTTP is allowed only for loopback with a port).' ;;
    esac
    case "$authority" in ''|*[!A-Za-z0-9.:-]*|:*|*:) fail 'Frontend must be an origin without credentials, path, query, or fragment.' ;; esac
    relay=${relay:-$relay_scheme://$authority/relay}
    relay=${relay%/}
    case "$relay" in
        wss://*) relay_address=${relay#wss://} ;;
        ws://localhost:*|ws://127.0.0.1:*) fail 'Loopback relay URLs point inside the worker container. Set --relay to a reachable WSS URL.' ;;
        *) fail 'Relay must use a reachable WSS URL.' ;;
    esac
    case "$relay_address" in ''|/*|*[!A-Za-z0-9._:/-]*) fail 'Relay must be a clean URL without credentials, query, or fragment.' ;; esac
    relay_host=${relay_address%%/*}
    relay_host=${relay_host%%:*}
    case "$relay_host" in
        localhost|127.*|0.0.0.0) fail 'Loopback relay URLs point inside the worker container. Set --relay to a reachable WSS URL.' ;;
    esac
    image=${image:-homarr:native-worker-local}
    case "$image" in ''|*[!A-Za-z0-9_./:@-]*|-*) fail 'Invalid Docker image name.' ;; esac
    if ! docker image inspect "$image" >/dev/null 2>&1; then
        printf 'Worker image %s is not available locally. Build it from this checkout:\n' "$image" >&2
        printf '  docker build --target worker -t %s .\n' "$image" >&2
        exit 1
    fi
    umask 077
    mkdir -p "$state"
    chmod 700 "$directory/.state" "$state"
    registration_file="$state/registration-token"
    if [ "${WORKER_RELAY_REGISTRATION_TOKEN+x}" = x ]; then
        if [ ! -f "$registration_file" ] || ! printf '%s' "$WORKER_RELAY_REGISTRATION_TOKEN" | cmp -s "$registration_file" -; then
            registration_changed=true
        fi
        printf '%s' "$WORKER_RELAY_REGISTRATION_TOKEN" > "$registration_file"
    elif [ ! -f "$registration_file" ]; then
        : > "$registration_file"
    fi
    chmod 600 "$registration_file"
    # Quote the host file path for Compose dotenv, preserving spaces and dollars.
    case "$registration_file" in *"'"*) fail 'Checkout path must not contain a single quote.' ;; esac
    printf 'HOMARR_WORKER_IMAGE=%s\nWORKER_PLATFORM_URL=%s/\nWORKER_ALLOWED_ORIGINS=%s\nWORKER_RELAY_URL=%s\nHOMARR_WORKER_REGISTRATION_FILE=\047%s\047\n' \
        "$image" "$frontend" "$frontend" "$relay" "$registration_file" > "$config"
    chmod 600 "$config"
elif [ ! -f "$config" ]; then
    printf 'This worker has not been started. Run bash scripts/worker.sh up --frontend https://HOST first.\n'
    exit 0
fi

# Use persisted settings consistently; an unrelated shell environment must not
# override the frontend or expose a relay registration token to Compose.
unset HOMARR_WORKER_IMAGE WORKER_PLATFORM_URL WORKER_ALLOWED_ORIGINS WORKER_RELAY_URL HOMARR_WORKER_REGISTRATION_FILE WORKER_RELAY_REGISTRATION_TOKEN

compose() {
    docker compose --project-name "$project" --env-file "$config" -f "$directory/relay.yml" "$@"
}

pair() {
    compose exec -T worker bun -e '
        const pairing=await Bun.file("/appdata/worker/pairing.json").json();
        if(pairing.claimed){
            console.log("Already claimed. Use your saved owner connection, an owner invitation, or local sign-in.");
            process.exit(0);
        }
        console.log("Open this private initial setup link in your browser (keep it secret):");
        console.log(pairing.url);
    '
}

case "$action" in
    up)
        set -- up -d --wait --wait-timeout 150
        if [ "$registration_changed" = true ]; then set -- "$@" --force-recreate; fi
        compose "$@"
        printf '\nWorker started. Open the setup link to verify the relay connection. No host ports are published.\n'
        pair
        ;;
    status) compose ps ;;
    pair) pair ;;
    down)
        compose down
        printf 'Worker stopped. Its data, identity and saved configuration are preserved.\n'
        ;;
esac
