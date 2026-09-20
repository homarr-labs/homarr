import { describe, expect, test } from "vitest";

import { resolveAssistantReasoning, resolveAssistantTemperature } from "./assistant-reasoning";

describe("resolveAssistantReasoning", () => {
  test("uses medium reasoning for automatic Custom Widget authoring on the GLM model", () => {
    expect(
      resolveAssistantReasoning({
        reasoning: "auto",
        customWidgetAuthoringActive: true,
        modelId: "z-ai/glm-5.3-flash",
        provider: "openrouter",
      }),
    ).toBe("medium");
    expect(
      resolveAssistantReasoning({
        reasoning: "auto",
        customWidgetAuthoringActive: true,
        modelId: "homarr/model",
        provider: "homarr",
      }),
    ).toBe("medium");
    expect(
      resolveAssistantTemperature({
        customWidgetAuthoringActive: true,
        modelId: "homarr/model",
        provider: "homarr",
      }),
    ).toBe(0.2);
  });

  test.each(["none", "high"] as const)("preserves explicit %s reasoning", (reasoning) => {
    expect(
      resolveAssistantReasoning({
        reasoning,
        customWidgetAuthoringActive: true,
        modelId: "z-ai/glm-5.3-flash",
        provider: "openrouter",
      }),
    ).toBe(reasoning);
  });

  test.each([
    { customWidgetAuthoringActive: false, modelId: "z-ai/glm-5.3-flash", provider: "openrouter" as const },
    { customWidgetAuthoringActive: true, modelId: "another/model", provider: "openrouter" as const },
    { customWidgetAuthoringActive: true, modelId: "homarr/model", provider: "custom" as const },
  ])("leaves automatic reasoning unchanged outside the scoped case", (input) => {
    expect(resolveAssistantReasoning({ ...input, reasoning: "auto" })).toBeUndefined();
  });
});
