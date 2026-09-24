import { describe, expect, test } from "vitest";

import { resolveAssistantReasoning, resolveAssistantTemperature } from "./assistant-reasoning";

describe("resolveAssistantReasoning", () => {
  test("uses high reasoning for automatic Custom Widget authoring on the selected Luna model", () => {
    expect(
      resolveAssistantReasoning({
        reasoning: "auto",
        customWidgetAuthoringActive: true,
        modelId: "openai/gpt-5.6-luna",
        provider: "openrouter",
      }),
    ).toBe("high");
    expect(
      resolveAssistantReasoning({
        reasoning: "auto",
        customWidgetAuthoringActive: true,
        modelId: "homarr/model",
        provider: "homarr",
      }),
    ).toBe("xhigh");
    expect(
      resolveAssistantTemperature({
        customWidgetAuthoringActive: true,
        modelId: "homarr/model",
        provider: "homarr",
      }),
    ).toBe(0.2);
  });

  test.each(["deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4-flash-latest"])(
    "uses max reasoning for automatic Custom Widget authoring on %s",
    (modelId) => {
      expect(
        resolveAssistantReasoning({
          reasoning: "auto",
          customWidgetAuthoringActive: true,
          modelId,
          provider: "openrouter",
        }),
      ).toBe("xhigh");
    },
  );

  test.each(["none", "high"] as const)("preserves explicit %s reasoning", (reasoning) => {
    expect(
      resolveAssistantReasoning({
        reasoning,
        customWidgetAuthoringActive: true,
        modelId: "openai/gpt-5.6-luna",
        provider: "openrouter",
      }),
    ).toBe(reasoning);
  });

  test.each([
    { customWidgetAuthoringActive: false, modelId: "openai/gpt-5.6-luna", provider: "openrouter" as const },
    { customWidgetAuthoringActive: true, modelId: "another/model", provider: "openrouter" as const },
    { customWidgetAuthoringActive: true, modelId: "homarr/model", provider: "custom" as const },
  ])("leaves automatic reasoning unchanged outside the scoped case", (input) => {
    expect(resolveAssistantReasoning({ ...input, reasoning: "auto" })).toBeUndefined();
  });
});
