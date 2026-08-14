import { describe, expect, it } from "vitest";

import { integrationKinds } from "@homarr/definitions";

import { buildSortedIntegrations } from "./integration-grid-shared";

describe("buildSortedIntegrations", () => {
  it("keeps every real integration available during onboarding", () => {
    const kinds = buildSortedIntegrations({ onboarding: true }).map((integration) => integration.kind);

    expect(kinds).toHaveLength(integrationKinds.length - 1);
    expect(kinds).not.toContain("mock");
  });
});
