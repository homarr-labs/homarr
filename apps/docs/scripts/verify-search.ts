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
    assert(result.url.startsWith("/docs/"), `Unexpected search destination: ${result.url}`);
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
