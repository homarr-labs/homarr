import { describe, expect, test } from "vitest";

import { mergeFederationResults, remapIntegrationResult } from "./operations";

describe("federated native result contracts", () => {
  test("same source IDs from different workers stay distinct without rewriting upstream IDs", () => {
    const result = [
      {
        integrationId: "same",
        integration: { id: "same", kind: "plex" },
        sessions: [{ id: "same", integrationId: "same" }],
      },
    ];
    const first = remapIntegrationResult(result, new Map([["same", "primary-alias-a"]]), "array");
    const second = remapIntegrationResult(result, new Map([["same", "primary-alias-b"]]), "array");
    expect(mergeFederationResults("array", [first, second])).toEqual([
      {
        integrationId: "primary-alias-a",
        integration: { id: "primary-alias-a", kind: "plex" },
        sessions: [{ id: "same", integrationId: "same" }],
      },
      {
        integrationId: "primary-alias-b",
        integration: { id: "primary-alias-b", kind: "plex" },
        sessions: [{ id: "same", integrationId: "same" }],
      },
    ]);
  });

  test("media release aggregate preserves source identity and partial failures", () => {
    const a = remapIntegrationResult(
      { releases: [{ id: "resource", integration: { id: "same" } }], failedIntegrations: [] },
      new Map([["same", "a"]]),
      "mediaReleases",
    );
    const b = remapIntegrationResult(
      { releases: [], failedIntegrations: [{ integrationId: "same", error: "INTEGRATION_REQUEST_FAILED" }] },
      new Map([["same", "b"]]),
      "mediaReleases",
    );
    expect(mergeFederationResults("mediaReleases", [a, b])).toEqual({
      releases: [{ id: "resource", integration: { id: "a" } }],
      failedIntegrations: [{ integrationId: "b", error: "INTEGRATION_REQUEST_FAILED" }],
    });
  });

  test("invalid upstream result shapes fail closed", () => {
    expect(() => mergeFederationResults("array", [{ data: [] }])).toThrow("Invalid federation result");
  });

  test("merged media requests retain native global status and date ordering", () => {
    const earlier = new Date("2026-01-01T00:00:00.001Z");
    const later = new Date("2026-01-01T00:00:00.002Z");
    const result = mergeFederationResults("requests", [
      { requests: [{ id: "earlier", status: "pending", createdAt: earlier }], failedIntegrations: [] },
      { requests: [{ id: "later", status: "pending", createdAt: later }], failedIntegrations: [] },
    ]);
    expect(result).toEqual({
      requests: [
        { id: "later", status: "pending", createdAt: later },
        { id: "earlier", status: "pending", createdAt: earlier },
      ],
      failedIntegrations: [],
    });
  });
});
