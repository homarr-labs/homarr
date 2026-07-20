import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_SKILL_MD, getCustomWidgetComponent, getCustomWidgetSkill } from "../core/authoring-resources";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

describe("custom widget Agent Skill", () => {
  test("keeps the MCP skill text synchronized with the repository source", async () => {
    const source = await readFile(resolve(repositoryRoot, ".agents/skills/homarr-custom-widget/SKILL.md"), "utf8");
    expect(CUSTOM_WIDGET_SKILL_MD).toBe(source);
    expect(getCustomWidgetSkill().skillMd).toBe(source);
  });

  test("publishes repository-based skills.sh installation metadata", () => {
    const skill = getCustomWidgetSkill();
    expect(skill.skillsShUrl).toBe("https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget");
    expect(skill.sourceUrl).toContain("github.com/homarr-labs/homarr/tree/v2/.agents/skills/homarr-custom-widget");
    expect(skill.installCommand).toBe(
      "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget",
    );
    expect(skill).not.toHaveProperty("sha256");
    expect(skill).not.toHaveProperty("downloadUrl");
  });

  test("publishes safe icon names with the Tabler icon component", () => {
    expect(getCustomWidgetComponent("TablerIcon")?.knownValues?.name).toContain("server");
  });
});
