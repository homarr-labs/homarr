import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/authoring-prompt";

describe("Copy AI prompt", () => {
  it("uses one self-contained prompt without an embedded-skill branch", () => {
    const source = readFileSync(
      `${process.cwd()}/apps/nextjs/src/app/[locale]/manage/custom-widgets/_copy-ai-prompt-button.tsx`,
      "utf8",
    );
    expect(source).toContain("buildCustomWidgetAiPrompt");
    expect(source).not.toContain("embedded-authoring-prompt");
    expect(source).not.toContain("Menu");
  });

  it("copies a complete prompt within the public size limit", () => {
    const prompt = buildCustomWidgetAiPrompt(undefined, null, null, "Create a Pokédex");
    expect(prompt.length).toBeLessThanOrEqual(12_000);
    expect(prompt).toContain("exactly one complete `json` fenced block");
    expect(prompt).toContain("one complete `jsx` fenced block");
  });
});
