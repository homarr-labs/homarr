import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  CUSTOM_WIDGET_SKILL_MD,
  CUSTOM_WIDGET_SKILL_SHA256,
  getCustomWidgetComponent,
  getCustomWidgetSkill,
} from "../core/authoring-resources";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

describe("custom widget Agent Skill", () => {
  test("keeps the MCP skill text synchronized with the repository source", async () => {
    const source = await readFile(resolve(repositoryRoot, ".agents/skills/homarr-custom-widget/SKILL.md"), "utf8");
    expect(CUSTOM_WIDGET_SKILL_MD).toBe(source);
    expect(getCustomWidgetSkill().skillMd).toBe(source);
  });

  test("publishes the exact archive hash", async () => {
    const archive = await readFile(
      resolve(repositoryRoot, "apps/docs/static/downloads/homarr-custom-widget-2.0.0.zip"),
    );
    expect(createHash("sha256").update(archive).digest("hex")).toBe(CUSTOM_WIDGET_SKILL_SHA256);
  });

  test("publishes safe icon names with the Tabler icon component", () => {
    expect(getCustomWidgetComponent("TablerIcon")?.knownValues?.name).toContain("server");
  });
});
