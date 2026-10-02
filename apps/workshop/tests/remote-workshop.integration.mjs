import assert from "node:assert/strict";

const baseUrl = process.env.WORKSHOP_TEST_URL;
const remoteUrl = process.env.WORKSHOP_REMOTE_API_URL?.replace(/\/$/, "").replace(/\/api$/, "");
assert.ok(baseUrl && remoteUrl, "WORKSHOP_TEST_URL and WORKSHOP_REMOTE_API_URL are required");
const response = await fetch(`${remoteUrl}/api/collections/workshop_listings/records?perPage=100`);
assert.equal(response.status, 200);
const { items } = await response.json();
assert.ok(items.length > 0, "Remote backend must contain public listings");
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
for (const item of items) {
  const page = await fetch(`${baseUrl}/workshop/${item.id}/`);
  assert.equal(page.status, 200, item.title);
  const html = await page.text();
  assert.ok(html.includes(`<title>${escapeHtml(item.title)} · Homarr Workshop</title>`), item.title);
  assert.ok(!html.includes('name="robots" content="noindex"'), item.title);
}
const missing = await fetch(`${baseUrl}/workshop/nonexistentitem/`);
assert.equal(missing.status, 404);
console.log(
  `Remote Workshop verified: ${items.length} direct item pages with HTTP 200 and metadata; missing item 404.`,
);
