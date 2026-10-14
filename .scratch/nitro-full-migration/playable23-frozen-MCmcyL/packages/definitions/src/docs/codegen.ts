import fs from "node:fs/promises";
import { z } from "zod/v4";

import { createDocumentationMetadata, documentationSitemapUrl, parseDocumentationSitemap } from "./metadata";

const snapshotUrl = new URL("./sitemap-paths.json", import.meta.url);
const outputUrl = new URL("./homarr-docs-sitemap.ts", import.meta.url);

const writeIfChangedAsync = async (url: URL, content: string) => {
  let existing: string | undefined;
  try {
    existing = await fs.readFile(url, "utf8");
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  if (existing !== content) {
    await fs.writeFile(url, content);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--refresh")) {
    throw new Error("Usage: codegen.ts [--refresh]");
  }

  let sitemapPaths: string[];
  if (args.includes("--refresh")) {
    const response = await fetch(documentationSitemapUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Could not refresh documentation sitemap: HTTP ${response.status}`);
    }
    sitemapPaths = parseDocumentationSitemap(await response.text());
  } else {
    sitemapPaths = z.array(z.string()).parse(JSON.parse(await fs.readFile(snapshotUrl, "utf8")));
  }

  const metadata = createDocumentationMetadata(sitemapPaths);
  if (args.includes("--refresh")) {
    await writeIfChangedAsync(snapshotUrl, metadata.snapshot);
  }
  await writeIfChangedAsync(outputUrl, metadata.source);
};

await main();
