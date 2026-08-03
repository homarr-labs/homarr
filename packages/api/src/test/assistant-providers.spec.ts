import { describe, expect, test } from "vitest";

import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderPresets,
  assistantProviderRequiresApiKey,
  getAssistantModelOptionLabel,
  resolveAssistantModelId,
} from "@homarr/definitions";

describe("assistant provider presets", () => {
  test("defines one complete preset for every provider", () => {
    expect(Object.keys(assistantProviderPresets)).toEqual(assistantProviderIds);
    expect(new Set(assistantProviderIds).size).toBe(assistantProviderIds.length);
  });

  test.each(assistantProviderIds.filter((provider) => provider !== "custom"))(
    "%s has a valid default endpoint",
    (provider) => {
      expect(() => new URL(assistantProviderPresets[provider].baseUrl)).not.toThrow();
      expect(assistantProviderPresets[provider].modelDiscoveryPath).toMatch(/^\/[^/]/);
    },
  );

  test("requires credentials for hosted providers but not local or custom endpoints", () => {
    for (const provider of assistantProviderIds) {
      expect(assistantProviderRequiresApiKey(provider)).toBe(assistantProviderPresets[provider].category === "hosted");
    }
  });

  test.each(assistantProviderIds.filter((provider) => provider !== "custom"))(
    "%s has a Dashboard Icons provider mark",
    (provider) => {
      const iconUrl = assistantProviderPresets[provider].iconUrl;
      expect(iconUrl).not.toBeNull();
      expect(() => new URL(iconUrl ?? "")).not.toThrow();
    },
  );

  test("keeps the display label separate from the provider model ID", () => {
    const model = {
      id: "deepseek/deepseek-v4-pro",
      name: "DeepSeek: DeepSeek V4 Pro",
    };

    expect(getAssistantModelOptionLabel(model)).toBe("DeepSeek: DeepSeek V4 Pro (deepseek/deepseek-v4-pro)");
    expect(resolveAssistantModelId([model], model.id)).toBe(model.id);
    expect(resolveAssistantModelId([model], getAssistantModelOptionLabel(model))).toBe(model.id);
  });

  test("allows OpenRouter server tools for OpenRouter, its Homarr proxy, and explicit custom proxies", () => {
    expect(assistantProviderCanUseOpenRouterServerTools("openrouter")).toBe(true);
    expect(assistantProviderCanUseOpenRouterServerTools("homarr")).toBe(true);
    expect(assistantProviderCanUseOpenRouterServerTools("custom")).toBe(true);
    expect(assistantProviderCanUseOpenRouterServerTools("openai")).toBe(false);
    expect(assistantProviderCanUseOpenRouterServerTools("anthropic")).toBe(false);
  });
});
