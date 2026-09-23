import assert from "node:assert/strict";

const baseUrl = process.env.WORKSHOP_TEST_URL;
if (!baseUrl) throw new Error("WORKSHOP_TEST_URL is required");

const indexResponse = await fetch(`${baseUrl}/api/search?q=board`);
assert.equal(indexResponse.status, 200, "PocketBase must serve the static search index under /api/search");
assert.equal((await indexResponse.json()).type, "advanced");

const compressedIndex = await fetch(`${baseUrl}/api/search`, { headers: { "Accept-Encoding": "gzip" } });
assert.equal(compressedIndex.headers.get("content-encoding"), "gzip", "large static indexes must be compressed");
assert.match(compressedIndex.headers.get("vary"), /Accept-Encoding/i);
const plainIndex = await fetch(`${baseUrl}/api/search`, { headers: { "Accept-Encoding": "identity" } });
assert.equal(plainIndex.headers.get("content-encoding"), null);
const indexText = await plainIndex.text();
assert.equal(await compressedIndex.text(), indexText, "compression must preserve the exported index");
const declinedIndex = await fetch(`${baseUrl}/api/search`, { headers: { "Accept-Encoding": "br, gzip; q=0" } });
assert.equal(declinedIndex.headers.get("content-encoding"), null, "an explicitly refused encoding must not be used");
assert.equal(await declinedIndex.text(), indexText);

for (const path of ["/llms.txt", "/llms-full.txt", "/llms.mdx/docs/content.md"]) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, path);
  assert.match(await response.text(), /^# /, `${path} must serve Markdown rather than the homepage`);
}

const missing = await fetch(`${baseUrl}/docs/this-page-does-not-exist`);
assert.equal(missing.status, 404);
assert.match(await missing.text(), /Page not found/);

const missingApi = await fetch(`${baseUrl}/api/this-endpoint-does-not-exist`);
assert.equal(missingApi.status, 404);
assert.match(missingApi.headers.get("content-type"), /application\/json/);
await missingApi.arrayBuffer();

const admin = await fetch(`${baseUrl}/workshop/admin/`);
assert.equal(admin.status, 200);
assert.match(await admin.text(), /Workshop moderation/);

const missingItem = await fetch(`${baseUrl}/workshop/nonexistentitem`);
assert.equal(missingItem.status, 404);
assert.match(await missingItem.text(), /name="robots" content="noindex"/);

for (const method of ["GET", "HEAD"]) {
  const headers = { "Accept-Encoding": "gzip" };
  const redirect = await fetch(`${baseUrl}/docs?example=1`, { method, headers, redirect: "manual" });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "/docs/?example=1");
  await redirect.arrayBuffer();
  const page = await fetch(`${baseUrl}/docs/`, { method, headers });
  assert.equal(page.status, 200);
  await page.arrayBuffer();
}

console.log("PocketBase static export routes passed");
