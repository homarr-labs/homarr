import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { customJsxAuthoringCatalog } from "../src/core/component-catalog";
import { customJsxExamples } from "../src/core/examples";
import { getCustomWidgetJsonSchema } from "../src/core/schema";

export const CUSTOM_WIDGET_SKILL_SOURCE_PATHS = [
  "SKILL.md",
  "references/schema.md",
  "references/widget-schema.json",
  "references/runtime.md",
  "references/security.md",
  "references/components.md",
  "references/component-catalog.json",
  "references/examples.json",
  "references/mantine-core.md",
  "references/mantine-dates.md",
  "references/mantine-charts.md",
  "references/homarr-components.md",
] as const;

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const skillRoot = resolve(repositoryRoot, ".agents/skills/homarr-custom-widget");
const outputPath = resolve(packageRoot, "src/core/skill-content.generated.json");

await writeFile(
  resolve(skillRoot, "references/widget-schema.json"),
  `${JSON.stringify(getCustomWidgetJsonSchema(), null, 2)}\n`,
);
await writeFile(
  resolve(skillRoot, "references/component-catalog.json"),
  `${JSON.stringify(customJsxAuthoringCatalog)}\n`,
);
await writeFile(resolve(skillRoot, "references/examples.json"), `${JSON.stringify(customJsxExamples, null, 2)}\n`);

const files = await Promise.all(
  CUSTOM_WIDGET_SKILL_SOURCE_PATHS.map(async (path) => ({
    path,
    content: normalizeMarkdown(await readFile(resolve(skillRoot, path), "utf8")),
  })),
);

await writeFile(outputPath, `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`);

function normalizeMarkdown(value: string) {
  return `${value.replace(/\r\n?/gu, "\n").trimEnd()}\n`;
}
