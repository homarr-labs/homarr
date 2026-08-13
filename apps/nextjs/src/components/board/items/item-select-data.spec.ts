import { describe, expect, it, vi } from "vitest";

import {
  getWidgetConnectionStatus,
  resolveMatchingIntegrationsAsync,
  tryLockSelection,
  unlockSelection,
} from "./item-select-data";

describe("getWidgetConnectionStatus", () => {
  const availableKinds = new Set(["sonarr" as const]);

  it("reports widgets with a configured compatible integration as ready", () => {
    expect(
      getWidgetConnectionStatus({
        supportedIntegrations: ["sonarr", "radarr"],
        availableKinds,
        connectionOptional: false,
      }),
    ).toBe("ready");
  });

  it("reports required integrations that are not configured as needing setup", () => {
    expect(
      getWidgetConnectionStatus({
        supportedIntegrations: ["radarr"],
        availableKinds,
        connectionOptional: false,
      }),
    ).toBe("needsSetup");
  });

  it.each([
    { supportedIntegrations: [], connectionOptional: false },
    { supportedIntegrations: ["radarr" as const], connectionOptional: true },
  ])("reports a widget without a required connection", ({ supportedIntegrations, connectionOptional }) => {
    expect(getWidgetConnectionStatus({ supportedIntegrations, availableKinds, connectionOptional })).toBe(
      "noConnectionRequired",
    );
  });
});

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

  it("excludes matching integrations the user cannot use", async () => {
    const currentData = [
      { id: "allowed", kind: "sonarr" as const, permissions: { hasUseAccess: true } },
      { id: "blocked", kind: "sonarr" as const, permissions: { hasUseAccess: false } },
    ];

    await expect(
      resolveMatchingIntegrationsAsync({
        hasIntegrationSupport: true,
        supportedIntegrations: ["sonarr"],
        currentData,
        ensureDataAsync: vi.fn(),
      }),
    ).resolves.toEqual([currentData[0]]);
  });
});
