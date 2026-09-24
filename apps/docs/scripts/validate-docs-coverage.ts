import fs from "node:fs";
import path from "node:path";

import { widgetDocSlugs } from "@homarr/definitions/docs/widget-doc-slugs";
import { getIntegrationDocumentationSlug, integrationKinds } from "@homarr/definitions/integration";

const docsDir = path.resolve(import.meta.dirname, "../docs");
const documentationEntries = [
  {
    label: "Integration",
    folder: "integrations",
    entries: integrationKinds.map((kind) => [kind, getIntegrationDocumentationSlug(kind)] as const),
  },
  { label: "Widget", folder: "widgets", entries: Object.entries(widgetDocSlugs) },
] as const;

const missing: string[] = [];

for (const { label, folder, entries } of documentationEntries) {
  for (const [kind, slug] of entries) {
    if (!slug) continue;
    const entryDirectory = path.join(docsDir, folder, slug);
    if (!fs.existsSync(path.join(entryDirectory, "index.mdx"))) {
      missing.push(`${label} "${kind}" -> docs/${folder}/${slug}/index.mdx`);
      continue;
    }

    const metadataModules = ["index.ts", "index.tsx"];
    const hasMetadataModule = metadataModules.some((file) => fs.existsSync(path.join(entryDirectory, file)));
    if (!hasMetadataModule) {
      missing.push(`${label} "${kind}" -> docs/${folder}/${slug}/index.ts or index.tsx`);
    }
  }
}

if (missing.length > 0) {
  throw new Error(
    `Missing documentation for ${missing.length} feature(s):\n${missing.map((item) => `  - ${item}`).join("\n")}`,
  );
}

console.log("Integration and widget documentation coverage passed");
