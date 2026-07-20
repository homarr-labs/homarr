import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetSkill,
} from "../core/authoring-resources";
import { CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL } from "../core/ai-prompt";
import { customJsxAuthoringCatalog } from "../core/component-catalog";
import {
  CUSTOM_WIDGET_OFFLINE_BUNDLE,
  CUSTOM_WIDGET_SKILL_FILES,
  CUSTOM_WIDGET_SKILL_MD,
} from "../core/embedded-ai-prompt";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const skillRoot = resolve(repositoryRoot, ".agents/skills/homarr-custom-widget");
const generatedPath = resolve(repositoryRoot, "packages/custom-widgets/src/core/skill-content.generated.json");
const MAX_OFFLINE_BUNDLE_CHARACTERS = 900_000;
const expectedPaths = [
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

describe("custom widget Agent Skill", () => {
  test("keeps every generated skill file synchronized with the repository source", async () => {
    const expectedFiles = await Promise.all(
      expectedPaths.map(async (path) => ({
        path,
        content: normalizeMarkdown(await readFile(resolve(skillRoot, path), "utf8")),
      })),
    );
    expect(CUSTOM_WIDGET_SKILL_FILES).toEqual(expectedFiles);
    expect(await readFile(generatedPath, "utf8")).toBe(
      `${JSON.stringify({ schemaVersion: 1, files: expectedFiles }, null, 2)}\n`,
    );
    expect(CUSTOM_WIDGET_SKILL_MD).toBe(expectedFiles[0]?.content);
    expect(getCustomWidgetSkill().skillMd).toBe(expectedFiles[0]?.content);
  });

  test("builds a complete self-verifying offline bundle", () => {
    for (const file of CUSTOM_WIDGET_SKILL_FILES) {
      expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).toContain(`--- BEGIN SKILL FILE: ${file.path} ---`);
      expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).toContain(file.content.trimEnd());
    }
    expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).not.toContain("--- BEGIN COMPACT COMPONENT CATALOG ---");
    expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).not.toContain("--- BEGIN CANONICAL RUNTIME EXAMPLES ---");
    expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).toContain("Custom Widget authoring version: 2.0.0");
    expect(CUSTOM_WIDGET_OFFLINE_BUNDLE).toContain("Mantine version: 9.4.1");
    expect(
      CUSTOM_WIDGET_OFFLINE_BUNDLE.endsWith(
        `${CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL}\nCharacters: ${CUSTOM_WIDGET_OFFLINE_BUNDLE.length}`,
      ),
    ).toBe(true);
    expect(CUSTOM_WIDGET_OFFLINE_BUNDLE.length).toBeLessThanOrEqual(MAX_OFFLINE_BUNDLE_CHARACTERS);
  });

  test("publishes repository-based skills.sh installation metadata", () => {
    const skill = getCustomWidgetSkill();
    expect(skill.skillsShUrl).toBe("https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget");
    expect(skill.sourceUrl).toBe("https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget");
    expect(skill.installCommand).toBe(
      "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget",
    );
    expect(skill).not.toHaveProperty("sha256");
    expect(skill).not.toHaveProperty("downloadUrl");
  });

  test("publishes safe icon names with the Tabler icon component", () => {
    expect(getCustomWidgetComponent("TablerIcon")?.knownValues?.name).toContain("server");
  });

  test("serves the canonical catalog and derives detailed component resources from it", () => {
    expect(getCustomWidgetComponentCatalog()).toBe(customJsxAuthoringCatalog);
    const textInput = getCustomWidgetComponent("TextInput");
    expect(textInput).toMatchObject({
      schemaVersion: customJsxAuthoringCatalog.schemaVersion,
      mantineVersion: customJsxAuthoringCatalog.mantineVersion,
      bind: { type: "string", initialProp: "defaultValue" },
    });
    expect(textInput?.props).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "label", type: expect.stringContaining("ReactNode") })]),
    );
  });
});

function normalizeMarkdown(value: string) {
  return `${value.replace(/\r\n?/gu, "\n").trimEnd()}\n`;
}
