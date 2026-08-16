import { describe, expect, it } from "vitest";

import { integrationKinds } from "@homarr/definitions";

import { buildSortedIntegrations } from "./integration-grid-shared";

describe("buildSortedIntegrations", () => {
  it("keeps every real integration available during onboarding", () => {
    const kinds = buildSortedIntegrations({ onboarding: true }).map((integration) => integration.kind);

    expect(kinds).toHaveLength(integrationKinds.length - 1);
    expect(kinds).not.toContain("mock");
  });

  it("limits the grid to the allowed integration kinds", () => {
    const kinds = buildSortedIntegrations({ allowedKinds: ["jellyfin", "sonarr"] }).map(
      (integration) => integration.kind,
    );

    expect(kinds).toEqual(expect.arrayContaining(["jellyfin", "sonarr"]));
    expect(kinds).toHaveLength(2);
  });
});
