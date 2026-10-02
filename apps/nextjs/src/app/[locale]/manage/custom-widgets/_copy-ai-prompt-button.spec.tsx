import { describe, expect, it } from "vitest";

import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/authoring-prompt";

describe("Copy AI prompt", () => {
  it("copies a complete prompt within the public size limit", () => {
    const prompt = buildCustomWidgetAiPrompt(undefined, null, null, "Create a Pokédex");
    expect(prompt.length).toBeLessThanOrEqual(12_000);
    expect(prompt).toContain("exactly one complete `json` fenced block");
    expect(prompt).toContain("Put the complete JSX source directly in the `template` string");
  });
});
