import { describe, expect, test } from "vitest";

import { resolveAssistantReasoning } from "./assistant-reasoning";

describe("resolveAssistantReasoning", () => {
  test("uses low reasoning for automatic Custom Widget authoring on the GLM model", () => {
    expect(
      resolveAssistantReasoning({
        reasoning: "auto",
        customWidgetAuthoringActive: true,
        modelId: "z-ai/glm-5.3-flash",
      }),
    ).toBe("low");
  });

  test.each(["none", "high"] as const)("preserves explicit %s reasoning", (reasoning) => {
    expect(
      resolveAssistantReasoning({
        reasoning,
        customWidgetAuthoringActive: true,
        modelId: "z-ai/glm-5.3-flash",
      }),
    ).toBe(reasoning);
  });

  test.each([
    { customWidgetAuthoringActive: false, modelId: "z-ai/glm-5.3-flash" },
    { customWidgetAuthoringActive: true, modelId: "another/model" },
  ])("leaves automatic reasoning unchanged outside the scoped case", (input) => {
    expect(resolveAssistantReasoning({ ...input, reasoning: "auto" })).toBeUndefined();
  });
});
