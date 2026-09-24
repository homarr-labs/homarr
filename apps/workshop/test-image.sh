#!/bin/sh
set -eu

WORKSHOP_IMAGE_TEST_PORT=${WORKSHOP_IMAGE_TEST_PORT:-18091}
WORKSHOP_IMAGE_TEST_NAME="homarr-workshop-image-test-$$"
WORKSHOP_IMAGE_TEST_RESTORED_NAME="homarr-workshop-image-restored-$$"
WORKSHOP_IMAGE_TEST_TAG=${WORKSHOP_IMAGE_TEST_IMAGE:-homarr-workshop:test-$$}
WORKSHOP_IMAGE_TEST_VOLUME="homarr-workshop-image-test-$$"
WORKSHOP_IMAGE_TEST_RESTORE_VOLUME="homarr-workshop-image-restore-$$"
WORKSHOP_IMAGE_TEST_BACKUP_DIR=$(mktemp -d)
WORKSHOP_IMAGE_TEST_BACKUP="$WORKSHOP_IMAGE_TEST_BACKUP_DIR/pb-data.tar"
TEST_WEBSITE_URL=https://docs.example.invalid
TEST_API_URL=https://api.example.invalid
TEST_WORKSHOP_URL=https://workshop.example.invalid

cleanup() {
  docker rm --force "$WORKSHOP_IMAGE_TEST_NAME" "$WORKSHOP_IMAGE_TEST_RESTORED_NAME" >/dev/null 2>&1 || true
  docker volume rm "$WORKSHOP_IMAGE_TEST_VOLUME" "$WORKSHOP_IMAGE_TEST_RESTORE_VOLUME" >/dev/null 2>&1 || true
  rm -rf "$WORKSHOP_IMAGE_TEST_BACKUP_DIR"
}
trap cleanup EXIT

verify_persisted_data() {
  WORKSHOP_TEST_URL="$1" node --input-type=module -e '
    import assert from "node:assert/strict";
    const baseUrl = process.env.WORKSHOP_TEST_URL;
    const response = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity: "workshop-image@example.invalid", password: "WorkshopImageTest123!" }),
    });
    assert.equal(response.status, 200, "superuser must survive restart or restore");
    const { token } = await response.json();
    const headers = { authorization: `Bearer ${token}` };
    const usersResponse = await fetch(`${baseUrl}/api/collections/users/records?perPage=200`, { headers });
    assert.equal(usersResponse.status, 200);
    const users = await usersResponse.json();
    const author = users.items.find((user) => user.email === "social-author@example.invalid");
    assert.ok(author, "user must survive restart or restore");
    const submissionsResponse = await fetch(`${baseUrl}/api/collections/submissions/records?perPage=200`, { headers });
    assert.equal(submissionsResponse.status, 200);
    const submissions = await submissionsResponse.json();
    const submission = submissions.items.find((item) => item.title === "Ocean <Glow>");
    assert.ok(submission, "submission must survive restart or restore");
    assert.equal(submission.author, author.id, "submission author must survive restart or restore");
    assert.equal(submission.content, "body { color: white; }", "submission content must survive restart or restore");
    assert.equal(submission.screenshots.length, 1, "screenshot reference must survive restart or restore");
    const screenshot = encodeURIComponent(submission.screenshots[0]);
    const screenshotResponse = await fetch(`${baseUrl}/api/files/submissions/${submission.id}/${screenshot}`, { headers });
    assert.equal(screenshotResponse.status, 200, "screenshot file must survive restart or restore");
    const expectedScreenshot = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    assert.deepEqual(Buffer.from(await screenshotResponse.arrayBuffer()), expectedScreenshot, "screenshot bytes must survive restart or restore");
  '
}

docker volume create "$WORKSHOP_IMAGE_TEST_VOLUME" >/dev/null
docker volume create "$WORKSHOP_IMAGE_TEST_RESTORE_VOLUME" >/dev/null

if [ -z "${WORKSHOP_IMAGE_TEST_IMAGE:-}" ]; then
  docker build --target production -f apps/workshop/Dockerfile -t "$WORKSHOP_IMAGE_TEST_TAG" .
fi
docker run --detach --name "$WORKSHOP_IMAGE_TEST_NAME" \
  --publish "127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT:8090" \
  --mount "type=volume,source=$WORKSHOP_IMAGE_TEST_VOLUME,target=/pb_data" \
  --env HOMARR_WEBSITE_URL="$TEST_WEBSITE_URL" \
  --env WORKSHOP_API_URL="$TEST_API_URL" \
  --env WORKSHOP_WEB_URL="$TEST_WORKSHOP_URL" \
  --env WORKSHOP_PUBLIC_ORIGIN="$TEST_API_URL" \
  --env PB_ALLOWED_ORIGINS='*' \
  "$WORKSHOP_IMAGE_TEST_TAG" >/dev/null

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker logs "$WORKSHOP_IMAGE_TEST_NAME"
    exit 1
  fi
  sleep 1
done

WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT" \
  EXPECTED_HOMARR_WEBSITE_URL="$TEST_WEBSITE_URL" \
  EXPECTED_WORKSHOP_API_URL="$TEST_API_URL" \
  EXPECTED_WORKSHOP_WEB_URL="$TEST_WORKSHOP_URL" \
  node apps/workshop/tests/runtime-config.integration.mjs

WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT" \
  node apps/workshop/tests/static-export.integration.mjs

docker exec "$WORKSHOP_IMAGE_TEST_NAME" pocketbase superuser create \
  workshop-image@example.invalid 'WorkshopImageTest123!' --dir=/pb_data
WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT" \
  EXPECTED_HOMARR_WEBSITE_URL="$TEST_WEBSITE_URL" \
  EXPECTED_WORKSHOP_API_URL="$TEST_API_URL" \
  EXPECTED_WORKSHOP_WEB_URL="$TEST_WORKSHOP_URL" \
  node apps/workshop/tests/workshop-social-metadata.integration.mjs

curl --fail --location --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/workshop" >/dev/null
curl --fail --silent \
  "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/collections/workshop_listings/records?perPage=1" >/dev/null
curl --fail --silent --dump-header - --output /dev/null \
  --header 'Origin: https://homarr.example' \
  "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/collections/workshop_listings/records?perPage=1" \
  | tr -d '\r' \
  | grep -qi '^Access-Control-Allow-Origin: \*$'

docker stop "$WORKSHOP_IMAGE_TEST_NAME" >/dev/null
mkdir -p "$WORKSHOP_IMAGE_TEST_BACKUP_DIR/data"
docker cp "$WORKSHOP_IMAGE_TEST_NAME:/pb_data/." "$WORKSHOP_IMAGE_TEST_BACKUP_DIR/data"
test -s "$WORKSHOP_IMAGE_TEST_BACKUP_DIR/data/data.db"
tar -C "$WORKSHOP_IMAGE_TEST_BACKUP_DIR/data" -cf "$WORKSHOP_IMAGE_TEST_BACKUP" .
docker rm "$WORKSHOP_IMAGE_TEST_NAME" >/dev/null

docker run --detach --name "$WORKSHOP_IMAGE_TEST_NAME" \
  --publish "127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT:8090" \
  --mount "type=volume,source=$WORKSHOP_IMAGE_TEST_VOLUME,target=/pb_data" \
  --env HOMARR_WEBSITE_URL="$TEST_WEBSITE_URL" \
  --env WORKSHOP_API_URL="$TEST_API_URL" \
  --env WORKSHOP_WEB_URL="$TEST_WORKSHOP_URL" \
  --env WORKSHOP_PUBLIC_ORIGIN="$TEST_API_URL" \
  --env PB_ALLOWED_ORIGINS='*' \
  "$WORKSHOP_IMAGE_TEST_TAG" >/dev/null

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker logs "$WORKSHOP_IMAGE_TEST_NAME"
    exit 1
  fi
  sleep 1
done

verify_persisted_data "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT"
echo "Workshop named-volume persistence passed"

docker stop "$WORKSHOP_IMAGE_TEST_NAME" >/dev/null
docker rm "$WORKSHOP_IMAGE_TEST_NAME" >/dev/null
docker run --rm \
  --mount "type=volume,source=$WORKSHOP_IMAGE_TEST_RESTORE_VOLUME,target=/pb_data" \
  --mount "type=bind,source=$WORKSHOP_IMAGE_TEST_BACKUP,target=/tmp/pb-data.tar,readonly" \
  --entrypoint sh \
  "$WORKSHOP_IMAGE_TEST_TAG" \
  -c 'tar -C /pb_data -xf /tmp/pb-data.tar'

docker run --detach --name "$WORKSHOP_IMAGE_TEST_RESTORED_NAME" \
  --publish "127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT:8090" \
  --mount "type=volume,source=$WORKSHOP_IMAGE_TEST_RESTORE_VOLUME,target=/pb_data" \
  --env HOMARR_WEBSITE_URL="$TEST_WEBSITE_URL" \
  --env WORKSHOP_API_URL="$TEST_API_URL" \
  --env WORKSHOP_WEB_URL="$TEST_WORKSHOP_URL" \
  --env WORKSHOP_PUBLIC_ORIGIN="$TEST_API_URL" \
  --env PB_ALLOWED_ORIGINS='*' \
  "$WORKSHOP_IMAGE_TEST_TAG" >/dev/null

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker logs "$WORKSHOP_IMAGE_TEST_RESTORED_NAME"
    exit 1
  fi
  sleep 1
done

verify_persisted_data "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT"
echo "Workshop backup restore passed"

echo "Workshop production image passed"
