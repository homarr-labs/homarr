#!/usr/bin/env bash
set -euo pipefail

# Bounded local checks for the pinned V2 image. This script uses one disposable
# container, an anonymous /appdata volume, and no host socket or bind mount.
IMAGE='homarr:v2-issue-triage-681c1dd1'
NAME='homarr-triage-v2-platform-681c1dd1'
PORT='47579'

cleanup() {
  docker rm -f -v "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
secret_key="$(openssl rand -hex 32)"
docker run -d \
  --name "$NAME" \
  --label homarr.triage=2026-09-18 \
  --cpus=2 \
  --memory=2g \
  -p "$PORT:7575" \
  -e SECRET_ENCRYPTION_KEY="$secret_key" \
  -e DEMO_MODE=true \
  -e DEMO_READ_ONLY=false \
  -e UNSAFE_ENABLE_MOCK_INTEGRATION=true \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e BASE_URL="http://127.0.0.1:$PORT" \
  -e NO_EXTERNAL_CONNECTION=true \
  "$IMAGE" >/dev/null

for attempt in $(seq 1 20); do
  status="$(curl --max-time 2 -sS -o /tmp/homarr-platform-health -w '%{http_code}' \
    "http://127.0.0.1:$PORT/api/health/live" 2>/dev/null || true)"
  if [[ "$status" == '200' ]]; then
    break
  fi
  sleep 1
done

cat /tmp/homarr-platform-health
curl --max-time 20 -sS \
  "http://127.0.0.1:$PORT/api/trpc/widget.weather.atLocation?input=%7B%22json%22%3A%7B%22latitude%22%3A48.8566%2C%22longitude%22%3A2.3522%7D%7D"
docker stop --timeout 15 "$NAME"
