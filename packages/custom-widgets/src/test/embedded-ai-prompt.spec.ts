import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL } from "../core/ai-prompt";
import { CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION } from "../core/ai-prompt";
import {
  buildCustomWidgetAiPromptWithEmbeddedSkill,
  CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT,
  CUSTOM_WIDGET_SKILL_FILES,
} from "../core/embedded-ai-prompt";

describe("buildCustomWidgetAiPromptWithEmbeddedSkill", () => {
  test("stays behind dedicated package exports instead of the core barrel", async () => {
    const packageRoot = resolve(import.meta.dirname, "../..");
    const [manifestSource, coreIndexSource] = await Promise.all([
      readFile(resolve(packageRoot, "package.json"), "utf8"),
      readFile(resolve(packageRoot, "src/core/index.ts"), "utf8"),
    ]);
    const manifest = JSON.parse(manifestSource) as { exports: Record<string, string> };

    expect(manifest.exports["./authoring-prompt"]).toBe("./src/core/ai-prompt.ts");
    expect(manifest.exports["./authoring-resources"]).toBe("./src/core/authoring-resources.ts");
    expect(manifest.exports["./embedded-authoring-prompt"]).toBe("./src/core/embedded-ai-prompt.ts");
    expect(coreIndexSource).not.toContain('export * from "./ai-prompt"');
    expect(coreIndexSource).not.toContain('export * from "./authoring-resources"');
    expect(coreIndexSource).not.toContain('export * from "./component-catalog"');
    expect(coreIndexSource).not.toContain('export * from "./component-registry"');
    expect(coreIndexSource).not.toContain('export * from "./embedded-ai-prompt"');
  });

  test("embeds the complete release-matched offline authoring bundle", () => {
    const prompt = buildCustomWidgetAiPromptWithEmbeddedSkill(
      undefined,
      undefined,
      undefined,
      "Create a status widget",
    );

    expect(prompt.startsWith("Please create this Homarr Custom JSX v2 widget:\n\nCreate a status widget")).toBe(true);
    expect(prompt).toContain("This clipboard workflow has no Homarr MCP tools, repository access, or local files.");
    expect(prompt).toContain(CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT);
    for (const file of CUSTOM_WIDGET_SKILL_FILES.filter(
      ({ path }) => !["references/component-catalog.json", "references/examples.json"].includes(path),
    )) {
      expect(prompt).toContain(`--- BEGIN SKILL FILE: ${file.path} ---`);
      expect(prompt).toContain(file.content.trimEnd());
    }
    expect(prompt).toContain('"name":"ActionButton"');
    expect(prompt).toContain('"name":"SubFetch"');
    expect(prompt).toContain("RecursiveList");
    expect(prompt).toContain("--- BEGIN CANONICAL COMPONENT CATALOG ---");
    expect(prompt).toContain("--- BEGIN CANONICAL RUNTIME EXAMPLES ---");
    expect(prompt.lastIndexOf(CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION)).toBeGreaterThan(
      prompt.indexOf("# Homarr Custom Widget offline authoring bundle"),
    );
    expect(prompt.length).toBeGreaterThan(500_000);
    expect(prompt.length).toBeLessThanOrEqual(1_700_000);
    expect(prompt.endsWith(`${CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL}\nCharacters: ${prompt.length}`)).toBe(true);
  });

  test("keeps the embedded bundle outside balanced prompt fences for a large existing widget", () => {
    const prompt = buildCustomWidgetAiPromptWithEmbeddedSkill(
      undefined,
      JSON.stringify({ items: Array.from({ length: 2_000 }, (_, index) => ({ index })) }),
      { template: "<Text>Large</Text>".repeat(2_000) },
      "Repair this widget",
    );
    const beforeBundle = prompt.slice(0, prompt.indexOf("This clipboard workflow has no Homarr MCP tools"));

    expect(beforeBundle.match(/```/gu)?.length ?? 0).toBe(4);
    expect(beforeBundle).toContain("Homarr will validate the result after it is pasted into the workbench.");
    expect(prompt).toContain("# Homarr Custom Widget offline authoring bundle");
    expect(prompt.length).toBeLessThanOrEqual(1_700_000);
  });
});
