import { describe, expect, it } from "vitest";

import type { IntegrationKind } from "@homarr/definitions";

// Helper functions mirroring the exact business logic from item-select-modal.tsx
export const getCompatibleIntegrations = <
  TIntegration extends { id: string; name: string; kind: IntegrationKind; url?: string },
>(
  supportedIntegrations: readonly IntegrationKind[] | undefined,
  integrationData: TIntegration[] | undefined,
) => {
  if (!supportedIntegrations) return [];
  return (integrationData ?? [])
    .filter((i) => supportedIntegrations.includes(i.kind))
    .map((i) => ({
      id: i.id,
      name: i.name,
      kind: i.kind,
      url: i.url,
    }));
};

export const sanitizeIntegrationIds = (selectedIds: string[], compatibleIntegrations: { id: string }[]): string[] => {
  const compatibleIds = new Set(compatibleIntegrations.map((i) => i.id));
  return selectedIds.filter((id) => compatibleIds.has(id));
};

export const resolvePreviewIntegrationIds = ({
  validIntegrationIds,
  supportsMock,
  mockIntegration,
}: {
  validIntegrationIds: string[];
  supportsMock: boolean;
  mockIntegration: { id: string } | null | undefined;
}): string[] => {
  if (validIntegrationIds.length > 0) return validIntegrationIds;
  if (supportsMock && mockIntegration) return [mockIntegration.id];
  return [];
};

export const computeInitialIntegrationIds = ({
  hasIntegrationSupport,
  maxIntegrations = Infinity,
  compatibleIntegrations,
}: {
  hasIntegrationSupport: boolean;
  maxIntegrations?: number;
  compatibleIntegrations: { id: string }[];
}): string[] => {
  if (!hasIntegrationSupport) return [];
  if (compatibleIntegrations.length === 1 && compatibleIntegrations[0]) {
    return [compatibleIntegrations[0].id];
  }
  return compatibleIntegrations.slice(0, maxIntegrations).map((i) => i.id);
};

export const appendOrReplaceIntegrationId = ({
  currentIds,
  newId,
  maxIntegrations = Infinity,
}: {
  currentIds: string[];
  newId: string;
  maxIntegrations?: number;
}): string[] => {
  return [...(maxIntegrations > 1 ? currentIds : []), newId];
};

describe("Advanced Add App - Integration ID Sanitization & Mock Fallback", () => {
  describe("getCompatibleIntegrations", () => {
    it("returns empty array when supportedIntegrations is undefined or empty", () => {
      const integrations = [{ id: "1", name: "Sonarr", kind: "sonarr" as IntegrationKind }];

      expect(getCompatibleIntegrations(undefined, integrations)).toEqual([]);
      expect(getCompatibleIntegrations([], integrations)).toEqual([]);
    });

    it("filters integration data to only include kinds supported by the widget", () => {
      const integrations = [
        { id: "sonarr-1", name: "Sonarr Instance", kind: "sonarr" as IntegrationKind, url: "http://sonarr.local" },
        { id: "radarr-1", name: "Radarr Instance", kind: "radarr" as IntegrationKind, url: "http://radarr.local" },
        { id: "plex-1", name: "Plex Server", kind: "plex" as IntegrationKind, url: "http://plex.local" },
      ];

      const compatible = getCompatibleIntegrations(["sonarr", "radarr"], integrations);
      expect(compatible).toEqual([
        { id: "sonarr-1", name: "Sonarr Instance", kind: "sonarr", url: "http://sonarr.local" },
        { id: "radarr-1", name: "Radarr Instance", kind: "radarr", url: "http://radarr.local" },
      ]);
    });

    it("returns empty array when integrationData is undefined", () => {
      expect(getCompatibleIntegrations(["sonarr"], undefined)).toEqual([]);
    });
  });

  describe("sanitizeIntegrationIds", () => {
    it("filters out IDs that are not present in compatible integrations", () => {
      const compatible = [{ id: "valid-1" }, { id: "valid-2" }];
      const selected = ["valid-1", "stale-deleted-id", "valid-2", "incompatible-service-id"];

      const sanitized = sanitizeIntegrationIds(selected, compatible);
      expect(sanitized).toEqual(["valid-1", "valid-2"]);
    });

    it("returns empty array when no selected IDs match compatible integrations", () => {
      const compatible = [{ id: "valid-1" }];
      const selected = ["unknown-1", "unknown-2"];

      expect(sanitizeIntegrationIds(selected, compatible)).toEqual([]);
    });

    it("returns empty array when compatible list is empty", () => {
      expect(sanitizeIntegrationIds(["any-id"], [])).toEqual([]);
    });
  });

  describe("resolvePreviewIntegrationIds (mock fallback logic)", () => {
    const mockIntegration = { id: "mock-instance-id" };

    it("uses validIntegrationIds when at least one valid integration is selected", () => {
      const previewIds = resolvePreviewIntegrationIds({
        validIntegrationIds: ["real-service-1"],
        supportsMock: true,
        mockIntegration,
      });

      expect(previewIds).toEqual(["real-service-1"]);
    });

    it("falls back to mock integration when validIntegrationIds is empty and widget supports mock", () => {
      const previewIds = resolvePreviewIntegrationIds({
        validIntegrationIds: [],
        supportsMock: true,
        mockIntegration,
      });

      expect(previewIds).toEqual(["mock-instance-id"]);
    });

    it("returns empty array when validIntegrationIds is empty and widget does NOT support mock", () => {
      const previewIds = resolvePreviewIntegrationIds({
        validIntegrationIds: [],
        supportsMock: false,
        mockIntegration,
      });

      expect(previewIds).toEqual([]);
    });

    it("returns empty array when validIntegrationIds is empty and mockIntegration is null/undefined", () => {
      const previewIds = resolvePreviewIntegrationIds({
        validIntegrationIds: [],
        supportsMock: true,
        mockIntegration: null,
      });

      expect(previewIds).toEqual([]);
    });

    it("prefers real integrations over mock integration even if mock is available", () => {
      const previewIds = resolvePreviewIntegrationIds({
        validIntegrationIds: ["plex-1", "jellyfin-1"],
        supportsMock: true,
        mockIntegration,
      });

      expect(previewIds).toEqual(["plex-1", "jellyfin-1"]);
      expect(previewIds).not.toContain("mock-instance-id");
    });
  });

  describe("computeInitialIntegrationIds", () => {
    it("returns empty array when widget has no integration support", () => {
      const initial = computeInitialIntegrationIds({
        hasIntegrationSupport: false,
        compatibleIntegrations: [{ id: "1" }],
      });
      expect(initial).toEqual([]);
    });

    it("auto-selects single choice when exactly 1 compatible integration exists", () => {
      const initial = computeInitialIntegrationIds({
        hasIntegrationSupport: true,
        maxIntegrations: 5,
        compatibleIntegrations: [{ id: "only-one" }],
      });
      expect(initial).toEqual(["only-one"]);
    });

    it("slices compatible integrations up to maxIntegrations when multiple exist", () => {
      const compatible = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];

      const singleSelect = computeInitialIntegrationIds({
        hasIntegrationSupport: true,
        maxIntegrations: 1,
        compatibleIntegrations: compatible,
      });
      expect(singleSelect).toEqual(["1"]);

      const multiSelect = computeInitialIntegrationIds({
        hasIntegrationSupport: true,
        maxIntegrations: 2,
        compatibleIntegrations: compatible,
      });
      expect(multiSelect).toEqual(["1", "2"]);

      const unlimited = computeInitialIntegrationIds({
        hasIntegrationSupport: true,
        compatibleIntegrations: compatible,
      });
      expect(unlimited).toEqual(["1", "2", "3", "4"]);
    });
  });

  describe("appendOrReplaceIntegrationId (inline create & demo service connection)", () => {
    it("replaces existing selection when maxIntegrations is 1 (single-select)", () => {
      const result = appendOrReplaceIntegrationId({
        currentIds: ["old-id"],
        newId: "new-id",
        maxIntegrations: 1,
      });
      expect(result).toEqual(["new-id"]);
    });

    it("appends to existing selection when maxIntegrations is greater than 1 (multi-select)", () => {
      const result = appendOrReplaceIntegrationId({
        currentIds: ["service-1", "service-2"],
        newId: "service-3",
        maxIntegrations: 3,
      });
      expect(result).toEqual(["service-1", "service-2", "service-3"]);
    });

    it("appends to empty selection correctly for both single and multi-select", () => {
      expect(
        appendOrReplaceIntegrationId({
          currentIds: [],
          newId: "created-id",
          maxIntegrations: 1,
        }),
      ).toEqual(["created-id"]);

      expect(
        appendOrReplaceIntegrationId({
          currentIds: [],
          newId: "created-id",
          maxIntegrations: 5,
        }),
      ).toEqual(["created-id"]);
    });
  });
});
