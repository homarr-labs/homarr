import { describe, expect, test } from "vitest";

import { assistantProviderIds, assistantProviderPresets, assistantProviderRequiresApiKey } from "@homarr/definitions";

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
});
