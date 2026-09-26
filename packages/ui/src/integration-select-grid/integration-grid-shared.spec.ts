import { describe, expect, it } from "vitest";

import { buildSortedIntegrations } from "./integration-grid-shared";

describe("buildSortedIntegrations", () => {
  it("limits the grid to the allowed integration kinds", () => {
    const kinds = buildSortedIntegrations({ allowedKinds: ["jellyfin", "sonarr"] }).map(
      (integration) => integration.kind,
    );

    expect(kinds).toEqual(expect.arrayContaining(["jellyfin", "sonarr"]));
    expect(kinds).toHaveLength(2);
  });
});
