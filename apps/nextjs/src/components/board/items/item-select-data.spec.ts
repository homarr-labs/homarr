import { describe, expect, it, vi } from "vitest";

import type { IntegrationKind } from "@homarr/definitions";

import {
  getWidgetConnectionStatus,
  resolveMatchingIntegrationsAsync,
  tryLockSelection,
  unlockSelection,
} from "./item-select-data";

describe("getWidgetConnectionStatus", () => {
  const availableKinds = new Set<IntegrationKind>(["sonarr", "plex"]);

  describe("ready status", () => {
    it("returns 'ready' when at least one supported integration is in availableKinds", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["sonarr", "radarr"],
          availableKinds,
          connectionOptional: false,
        }),
      ).toBe("ready");
    });

    it("returns 'ready' when all supported integrations are in availableKinds", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["sonarr", "plex"],
          availableKinds,
          connectionOptional: false,
        }),
      ).toBe("ready");
    });

    it("returns 'ready' even if connectionOptional is true as long as a matching integration exists", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["sonarr"],
          availableKinds,
          connectionOptional: true,
        }),
      ).toBe("ready");
    });
  });

  describe("needsSetup status", () => {
    it("returns 'needsSetup' when supported integrations are non-empty, none are available, and connectionOptional is false", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["radarr", "sabNzbd"],
          availableKinds,
          connectionOptional: false,
        }),
      ).toBe("needsSetup");
    });

    it("returns 'needsSetup' when availableKinds is empty and connection is required", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["sonarr"],
          availableKinds: new Set<IntegrationKind>(),
          connectionOptional: false,
        }),
      ).toBe("needsSetup");
    });
  });

  describe("noConnectionRequired status", () => {
    it("returns 'noConnectionRequired' when supportedIntegrations is empty regardless of connectionOptional", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: [],
          availableKinds,
          connectionOptional: false,
        }),
      ).toBe("noConnectionRequired");

      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: [],
          availableKinds: new Set(),
          connectionOptional: true,
        }),
      ).toBe("noConnectionRequired");
    });

    it("returns 'noConnectionRequired' when connectionOptional is true and no supported integrations are available", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["radarr", "jellyfin"],
          availableKinds,
          connectionOptional: true,
        }),
      ).toBe("noConnectionRequired");
    });

    it("returns 'noConnectionRequired' when connectionOptional is true and availableKinds is empty", () => {
      expect(
        getWidgetConnectionStatus({
          supportedIntegrations: ["sonarr"],
          availableKinds: new Set(),
          connectionOptional: true,
        }),
      ).toBe("noConnectionRequired");
    });
  });
});

describe("selection concurrency locks", () => {
  it("acquires lock on unlocked ref and sets current to true", () => {
    const lock = { current: false };

    const acquired = tryLockSelection(lock);
    expect(acquired).toBe(true);
    expect(lock.current).toBe(true);
  });

  it("rejects lock acquisition on an already locked ref", () => {
    const lock = { current: true };

    const acquired = tryLockSelection(lock);
    expect(acquired).toBe(false);
    expect(lock.current).toBe(true);
  });

  it("unlocks lock and allows subsequent acquisition", () => {
    const lock = { current: false };

    expect(tryLockSelection(lock)).toBe(true);
    expect(tryLockSelection(lock)).toBe(false);

    unlockSelection(lock);
    expect(lock.current).toBe(false);

    expect(tryLockSelection(lock)).toBe(true);
  });

  it("handles repeated unlock safely without throwing", () => {
    const lock = { current: false };
    expect(() => {
      unlockSelection(lock);
      unlockSelection(lock);
    }).not.toThrow();
    expect(lock.current).toBe(false);
  });

  it("prevents multiple concurrent callers from proceeding simultaneously", () => {
    const lock = { current: false };
    const results: boolean[] = [];

    // Simulate 5 simultaneous selection attempts
    for (let i = 0; i < 5; i++) {
      results.push(tryLockSelection(lock));
    }

    expect(results).toEqual([true, false, false, false, false]);
  });
});

describe("resolveMatchingIntegrationsAsync", () => {
  it("returns empty array immediately when widget does not support integrations without calling ensureDataAsync", async () => {
    const ensureDataAsync = vi.fn(async () => [{ id: "1", kind: "sonarr" as IntegrationKind }]);

    const result = await resolveMatchingIntegrationsAsync({
      hasIntegrationSupport: false,
      supportedIntegrations: ["sonarr"],
      currentData: undefined,
      ensureDataAsync,
    });

    expect(result).toEqual([]);
    expect(ensureDataAsync).not.toHaveBeenCalled();
  });

  it("uses currentData synchronously when available without calling ensureDataAsync", async () => {
    const currentData = [
      { id: "1", kind: "sonarr" as IntegrationKind, permissions: { hasUseAccess: true } },
      { id: "2", kind: "radarr" as IntegrationKind, permissions: { hasUseAccess: true } },
      { id: "3", kind: "plex" as IntegrationKind, permissions: { hasUseAccess: true } },
    ];
    const ensureDataAsync = vi.fn();

    const result = await resolveMatchingIntegrationsAsync({
      hasIntegrationSupport: true,
      supportedIntegrations: ["sonarr", "radarr"],
      currentData,
      ensureDataAsync,
    });

    expect(result).toEqual([currentData[0], currentData[1]]);
    expect(ensureDataAsync).not.toHaveBeenCalled();
  });

  it("calls ensureDataAsync when currentData is undefined and filters by supported kinds", async () => {
    const fetchedData = [
      { id: "1", kind: "sonarr" as IntegrationKind },
      { id: "2", kind: "radarr" as IntegrationKind },
      { id: "3", kind: "sabNzbd" as IntegrationKind },
    ];
    const ensureDataAsync = vi.fn(async () => fetchedData);

    const result = await resolveMatchingIntegrationsAsync({
      hasIntegrationSupport: true,
      supportedIntegrations: ["radarr", "sabNzbd"],
      currentData: undefined,
      ensureDataAsync,
    });

    expect(result).toEqual([fetchedData[1], fetchedData[2]]);
    expect(ensureDataAsync).toHaveBeenCalledOnce();
  });

  it("excludes integrations where permissions.hasUseAccess is explicitly false", async () => {
    const currentData = [
      { id: "allowed-1", kind: "sonarr" as IntegrationKind, permissions: { hasUseAccess: true } },
      { id: "blocked-1", kind: "sonarr" as IntegrationKind, permissions: { hasUseAccess: false } },
      { id: "allowed-no-perms", kind: "sonarr" as IntegrationKind },
    ];

    const result = await resolveMatchingIntegrationsAsync({
      hasIntegrationSupport: true,
      supportedIntegrations: ["sonarr"],
      currentData,
      ensureDataAsync: vi.fn(),
    });

    expect(result).toEqual([currentData[0], currentData[2]]);
  });

  it("returns empty array when none of the fetched integrations match supported kinds", async () => {
    const fetchedData = [
      { id: "1", kind: "plex" as IntegrationKind },
      { id: "2", kind: "jellyfin" as IntegrationKind },
    ];
    const ensureDataAsync = vi.fn(async () => fetchedData);

    const result = await resolveMatchingIntegrationsAsync({
      hasIntegrationSupport: true,
      supportedIntegrations: ["sonarr", "radarr"],
      currentData: undefined,
      ensureDataAsync,
    });

    expect(result).toEqual([]);
    expect(ensureDataAsync).toHaveBeenCalledOnce();
  });

  it("propagates error when ensureDataAsync rejects", async () => {
    const ensureDataAsync = vi.fn(async () => {
      throw new Error("Network timeout");
    });

    await expect(
      resolveMatchingIntegrationsAsync({
        hasIntegrationSupport: true,
        supportedIntegrations: ["sonarr"],
        currentData: undefined,
        ensureDataAsync,
      }),
    ).rejects.toThrow("Network timeout");
  });
});
