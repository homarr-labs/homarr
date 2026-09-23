import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { staticClient } from "fumadocs-core/search/client/orama-static";

const outputDirectory = path.resolve("out");
const index = await readFile(path.join(outputDirectory, "api/search"), "utf8");
// Exercise the same client and exported database as the browser, without a server.
const from = `data:application/json;base64,${Buffer.from(index).toString("base64")}`;
const client = staticClient({ from });
const cases = [
  { query: "Sonarr", type: "page", url: "/docs/integrations/sonarr" },
  { query: "Docker Compose", type: "heading", url: "/docs/getting-started/installation/docker#docker-compose" },
  { query: "SECRET_ENCRYPTION_KEY", type: "text", url: "/docs/advanced/environment-variables" },
] as const;
const verifiedUrls = new Set<string>();

for (const test of cases) {
  const results = await client.search(test.query);
  assert(
    results.some(
      (result) =>
        result.type === test.type &&
        result.url.split("#")[0] === test.url.split("#")[0] &&
        (!test.url.includes("#") || result.url === test.url),
    ),
    `${test.query}: missing ${test.type} result for ${test.url}`,
  );

  for (const result of results) {
    assert(/^\/(?:docs|api-reference)(?:\/|#|$)/.test(result.url), `Unexpected search destination: ${result.url}`);
    if (verifiedUrls.has(result.url)) continue;
    const url = new URL(result.url, "https://homarr.dev");
    const html = await readFile(path.join(outputDirectory, decodeURIComponent(url.pathname), "index.html"), "utf8");
    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert(
        load(html)("[id]")
          .toArray()
          .some((element) => element.attribs.id === id),
        `Missing search anchor: ${result.url}`,
      );
    }
    verifiedUrls.add(result.url);
  }
  console.log(`${test.query}: ${results.length} results; expected ${test.type} found`);
}

assert.deepEqual(await client.search("homarrsearchnomatchqzxv987654321"), [], "Unknown words should return no results");
const credentialResults = await staticClient({ from, search: { limit: 1000 } }).search("API Key");
assert(
  credentialResults.some((result) => result.type === "text" && result.url.startsWith("/docs/integrations/sonarr#")),
  "Sonarr credential metadata must be searchable",
);

for (const [slug, expected] of [
  ["integrations/sonarr", ["API Key", "Management", "Calendar"]],
  ["widgets/calendar", ["Radarr release type", "Default:", "Show unmonitored"]],
] as const) {
  const markdown = await readFile(path.join(outputDirectory, "llms.mdx/docs", slug, "content.md"), "utf8");
  for (const text of expected) assert(markdown.includes(text), `${slug}: missing resolved metadata ${text}`);
  assert(!/<(?:Integration|Widget|Adding)[A-Z][^>]*[/>]/.test(markdown), `${slug}: unresolved metadata component`);
}

const openApi = JSON.parse(await readFile(path.join(outputDirectory, "api/open-api-schema.json"), "utf8"));
const apiClient = staticClient({ from, search: { limit: 1000 } });
let operationCount = 0;
for (const [apiPath, pathItem] of Object.entries(openApi.paths)) {
  for (const [method, operation] of Object.entries(pathItem as Record<string, { operationId?: string }>)) {
    const operationId = operation.operationId;
    if (!operationId) continue;
    const results = await apiClient.search(operationId);
    const result = results.find((entry) => entry.url.startsWith("/api-reference/") && entry.url.includes(operationId));
    assert(result, `${method} ${apiPath}: operation must be searchable by ID`);
    const destination = new URL(result.url, "https://homarr.dev");
    assert(!destination.hash, `${result.url}: generated API search text must not invent anchors`);
    await access(path.join(outputDirectory, destination.pathname, "index.html"));
    const markdown = await readFile(path.join(outputDirectory, "llms.mdx", destination.pathname, "content.md"), "utf8");
    assert(
      markdown.includes(`${method.toUpperCase()} ${apiPath}`),
      `${result.url}: Markdown must describe its request`,
    );
    assert(markdown.includes(operationId), `${result.url}: Markdown must identify its operation`);
    verifiedUrls.add(result.url);
    operationCount++;
  }
}
assert(operationCount > 0, "API operation coverage must not be empty");
const playground = await readFile(
  path.join(outputDirectory, "llms.mdx/docs/management/custom-widgets/custom-jsx/content.md"),
  "utf8",
);
assert(
  playground.includes('bind="name"') && playground.includes("data.server.used"),
  "Playground source must remain readable in Markdown",
);
assert(!playground.includes("<WidgetPlayground"), "Playground must have a resolved Markdown adapter");
console.log(`API discovery verified: ${operationCount} operations in search and Markdown.`);

const discovery = await readFile(path.join(outputDirectory, "llms.txt"), "utf8");
const markdownLinks = [...discovery.matchAll(/\]\(([^)]*\/llms\.mdx\/[^)]+)\)/g)];
assert(markdownLinks.length > 0, "LLM discovery must link to exported Markdown");
await Promise.all(
  markdownLinks.map(async ([, href]) => {
    const url = new URL(href, "https://homarr.dev");
    await access(path.join(outputDirectory, decodeURIComponent(url.pathname)));
  }),
);
console.log(`LLM discovery verified: ${markdownLinks.length} Markdown exports.`);
console.log(`Search verified: page titles, headings, body content, and ${verifiedUrls.size} destinations.`);
