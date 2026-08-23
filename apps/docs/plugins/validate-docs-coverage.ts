import type { LoadContext, Plugin } from "@docusaurus/types";
import fs from "node:fs";
import path from "node:path";

import { widgetDocSlugs } from "@homarr/definitions/docs/widget-doc-slugs";
import { getIntegrationDocumentationSlug, integrationKinds } from "@homarr/definitions/integration";

const documentationEntries = [
  {
    label: "Integration",
    folder: "integrations",
    entries: integrationKinds.map((kind) => [kind, getIntegrationDocumentationSlug(kind)] as const),
  },
  { label: "Widget", folder: "widgets", entries: Object.entries(widgetDocSlugs) },
] as const;

export default function validateDocsCoveragePlugin(context: LoadContext): Plugin {
  return {
    name: "validate-docs-coverage",
    async loadContent() {
      const docsDir = path.resolve(context.siteDir, "docs");
      const missing: string[] = [];

      for (const { label, folder, entries } of documentationEntries) {
        for (const [kind, slug] of entries) {
          if (!slug) continue;
          if (!fs.existsSync(path.join(docsDir, folder, slug))) {
            missing.push(`${label} "${kind}" -> docs/${folder}/${slug}/`);
          }
        }
      }

      if (missing.length > 0) {
        throw new Error(
          `Missing documentation for ${missing.length} feature(s):\n` +
            missing.map((m) => `  - ${m}`).join("\n") +
            "\n\nCreate the missing doc folders with index.ts + index.mdx.",
        );
      }
    },
  };
}
