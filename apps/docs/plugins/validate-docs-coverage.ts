import type { LoadContext, Plugin } from "@docusaurus/types";
import fs from "node:fs";
import path from "node:path";

import { integrationDocSlugs } from "@homarr/definitions/docs/integration-doc-slugs";
import { widgetDocSlugs } from "@homarr/definitions/docs/widget-doc-slugs";

const slugMaps = {
  Integration: { slugs: integrationDocSlugs, folder: "integrations" },
  Widget: { slugs: widgetDocSlugs, folder: "widgets" },
} as const;

export default function validateDocsCoveragePlugin(context: LoadContext): Plugin {
  return {
    name: "validate-docs-coverage",
    async loadContent() {
      const docsDir = path.resolve(context.siteDir, "docs");
      const missing: string[] = [];

      for (const [label, { slugs, folder }] of Object.entries(slugMaps)) {
        for (const [kind, slug] of Object.entries(slugs)) {
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
