import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const widgetsRoot = path.join(repositoryRoot, "packages/widgets/src");

const readOption = (name: string) => {
  const optionIndex = process.argv.indexOf(name);
  if (optionIndex < 0) return undefined;
  return process.argv[optionIndex + 1];
};

const kind = process.argv[2];
if (!kind || kind.startsWith("--")) {
  throw new Error("Usage: pnpm widgets:new <kind> [--slug <docs-slug>] [--icon <TablerIconExport>]");
}
if (!/^[a-z][A-Za-z0-9]*$/.test(kind)) {
  throw new Error("Widget kind must be a stable lower-camel-case identifier");
}

const defaultSlug = kind.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
const slug = readOption("--slug") ?? defaultSlug;
const icon = readOption("--icon") ?? "IconLayoutGrid";
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("Widget slug must use lower-case kebab-case");
if (!/^Icon[A-Za-z0-9]+$/.test(icon)) throw new Error("Widget icon must be a named Tabler Icon export");

const title = slug
  .split("-")
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(" ");
const directory = path.join(widgetsRoot, slug);
await mkdir(directory);
await mkdir(path.join(directory, "docs"));

const files = {
  "module.ts": `import { defineWidgetModule } from "@homarr/definitions";

export default defineWidgetModule({
  kind: ${JSON.stringify(kind)},
  icon: ${JSON.stringify(icon)},
  clientEntry: ".",
  documentation: {
    slug: ${JSON.stringify(slug)},
    sourceDirectory: "docs",
  },
});
`,
  "index.ts": `import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { widgetIcon } from "./module.generated";

export const { definition, componentLoader } = createWidgetDefinition(${JSON.stringify(kind)}, {
  icon: widgetIcon,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
}).withDynamicImport(() => import("./component"));
`,
  "component.tsx": `"use client";

import type { WidgetComponentProps } from "../definition";

const Component = (_props: WidgetComponentProps<${JSON.stringify(kind)}>) => null;

export default Component;
`,
  "docs/index.mdx": `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(`Documentation for the ${title} widget.`)}
---

Describe the widget, its configuration, data source, permissions, and interactions here.
`,
} as const;

for (const [relativePath, content] of Object.entries(files)) {
  await writeFile(path.join(directory, relativePath), content, { flag: "wx" });
}

await import("./sync-widget-modules.mts");
console.log(`Created widget module ${kind} in ${path.relative(repositoryRoot, directory)}`);
