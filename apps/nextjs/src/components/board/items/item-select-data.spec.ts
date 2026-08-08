import { describe, expect, it, vi } from "vitest";

import { resolveMatchingIntegrationsAsync, tryLockSelection, unlockSelection } from "./item-select-data";

describe("widget selection lock", () => {
  it("rejects repeated selection synchronously until the active selection finishes", () => {
    const lock = { current: false };

    expect(tryLockSelection(lock)).toBe(true);
    expect(tryLockSelection(lock)).toBe(false);

    unlockSelection(lock);
    expect(tryLockSelection(lock)).toBe(true);
  });
});

describe("resolveMatchingIntegrationsAsync", () => {
  it("waits for the shared integration query before a cold integration-backed selection", async () => {
    const ensureDataAsync = vi.fn(async () => [
      { id: "matching", kind: "sonarr" as const },
      { id: "other", kind: "radarr" as const },
    ]);

    await expect(
      resolveMatchingIntegrationsAsync({
        hasIntegrationSupport: true,
        supportedIntegrations: ["sonarr"],
        currentData: undefined,
        ensureDataAsync,
      }),
    ).resolves.toEqual([{ id: "matching", kind: "sonarr" }]);
    expect(ensureDataAsync).toHaveBeenCalledOnce();
  });

  it("does not wait for integrations when the widget has no integration support", async () => {
    const ensureDataAsync = vi.fn(async () => [{ id: "unused", kind: "sonarr" as const }]);

    await expect(
      resolveMatchingIntegrationsAsync({
        hasIntegrationSupport: false,
        supportedIntegrations: [],
        currentData: undefined,
        ensureDataAsync,
      }),
    ).resolves.toEqual([]);
    expect(ensureDataAsync).not.toHaveBeenCalled();
  });
});
