import { describe, expect, it } from "vitest";

import { integrationKinds } from "@homarr/definitions";

import { buildSortedIntegrations } from "./integration-grid-shared";

describe("buildSortedIntegrations", () => {
  it("keeps credential integrations in onboarding and reserves Frameleaf OAuth for signed-in setup", () => {
    const kinds = buildSortedIntegrations({ onboarding: true }).map((integration) => integration.kind);

    expect(kinds).toHaveLength(integrationKinds.filter((kind) => kind !== "mock" && kind !== "frameleaf").length);
    expect(kinds).not.toContain("mock");
    expect(kinds).not.toContain("frameleaf");
    expect(buildSortedIntegrations().map((integration) => integration.kind)).toContain("frameleaf");
  });

  it("limits the grid to the allowed integration kinds", () => {
    const kinds = buildSortedIntegrations({ allowedKinds: ["jellyfin", "sonarr"] }).map(
      (integration) => integration.kind,
    );

    expect(kinds).toEqual(expect.arrayContaining(["jellyfin", "sonarr"]));
    expect(kinds).toHaveLength(2);
  });
});
