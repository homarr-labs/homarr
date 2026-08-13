import { describe, expect, test } from "vitest";

import { getBoardRecipeDismissalKey, getBoardRecipeRecommendations } from "./board-recipe-recommendations";

test("recipe dismissal is scoped to both the board and integration kind", () => {
  expect(getBoardRecipeDismissalKey("board-a", "piHole")).not.toBe(getBoardRecipeDismissalKey("board-b", "piHole"));
  expect(getBoardRecipeDismissalKey("board-a", "piHole")).not.toBe(getBoardRecipeDismissalKey("board-a", "jellyfin"));
});

describe("getBoardRecipeRecommendations", () => {
  test("prioritizes widgets unlocked by the newly connected service", () => {
    const recommendations = getBoardRecipeRecommendations({
      configuredIntegrationKinds: ["piHole", "jellyfin"],
      existingItemKinds: [],
      preferredIntegrationKind: "jellyfin",
    });

    expect(recommendations).toHaveLength(3);
    expect(recommendations.slice(0, 2).every(({ isNewlyAvailable }) => isNewlyAvailable)).toBe(true);
    expect(recommendations.at(2)).toEqual(
      expect.objectContaining({ integrationKind: "piHole", isNewlyAvailable: false }),
    );
  });

  test("does not recommend widget kinds already present on the board", () => {
    const recommendations = getBoardRecipeRecommendations({
      configuredIntegrationKinds: ["piHole"],
      existingItemKinds: ["dnsHoleSummary"],
      preferredIntegrationKind: "piHole",
    });

    expect(recommendations.map(({ widgetKind }) => widgetKind)).toEqual(["dnsHoleControls"]);
  });

  test("deduplicates configured kinds and emitted widget capabilities", () => {
    const recommendations = getBoardRecipeRecommendations({
      configuredIntegrationKinds: ["piHole", "piHole"],
      existingItemKinds: [],
      limit: 10,
    });

    expect(recommendations.map(({ widgetKind }) => widgetKind)).toEqual(["dnsHoleControls", "dnsHoleSummary"]);
  });

  test("falls back to other configured integrations when the new service has no missing widgets", () => {
    const recommendations = getBoardRecipeRecommendations({
      configuredIntegrationKinds: ["piHole", "jellyfin"],
      existingItemKinds: ["dnsHoleSummary", "dnsHoleControls"],
      preferredIntegrationKind: "piHole",
      limit: 1,
    });

    expect(recommendations).toEqual([
      expect.objectContaining({ integrationKind: "jellyfin", isNewlyAvailable: false }),
    ]);
  });

  test("returns no recipes without a usable connection or capacity", () => {
    expect(
      getBoardRecipeRecommendations({
        configuredIntegrationKinds: [],
        existingItemKinds: [],
      }),
    ).toEqual([]);
    expect(
      getBoardRecipeRecommendations({
        configuredIntegrationKinds: ["piHole"],
        existingItemKinds: [],
        limit: 0,
      }),
    ).toEqual([]);
  });
});
