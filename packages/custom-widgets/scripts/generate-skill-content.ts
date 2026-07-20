import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const CUSTOM_WIDGET_SKILL_SOURCE_PATHS = [
  "SKILL.md",
  "references/schema.md",
  "references/runtime.md",
  "references/security.md",
  "references/components.md",
  "references/mantine-core.md",
  "references/mantine-dates.md",
  "references/mantine-charts.md",
  "references/homarr-components.md",
] as const;

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const skillRoot = resolve(repositoryRoot, ".agents/skills/homarr-custom-widget");
const outputPath = resolve(packageRoot, "src/core/skill-content.generated.json");

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
