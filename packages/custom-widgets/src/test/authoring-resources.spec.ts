import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetSkill,
  getCustomWidgetSkillContent,
} from "../core/authoring-resources";

describe("authoring resources", () => {
  it("returns the concise skills.sh discovery shape", () => {
    const skill = getCustomWidgetSkill();
    expect(skill).toMatchObject({ name: "homarr-custom-widget", version: "2.0.0" });
    expect(skill.skillsShUrl).toContain("skills.sh/homarr-labs/homarr");
    expect(skill.sourceUrl).toContain("/tree/HEAD/.agents/skills/homarr-custom-widget");
    expect(skill.installCommand).toContain("--skill homarr-custom-widget");
    expect(skill).not.toHaveProperty("files");
    expect(skill).not.toHaveProperty("componentCatalog");
    expect(getCustomWidgetSkillContent()).toBe(skill.skillMd);
    expect(skill.skillMd.trim()).toBe(
      readFileSync(path.join(process.cwd(), ".agents/skills/homarr-custom-widget/SKILL.md"), "utf8").trim(),
    );
  });

  it("keeps the full catalog retrieval-based", () => {
    expect(getCustomWidgetComponentCatalog().components.length).toBeGreaterThan(100);
    expect(getCustomWidgetComponent("Stack")?.name).toBe("Stack");
    expect(getCustomWidgetComponent("Icon")?.knownValues?.name.length).toBeGreaterThan(100);
  });
});
