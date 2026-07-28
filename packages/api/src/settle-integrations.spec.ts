// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { getIntegrationQueryProvenance, settleIntegrationQueries } from "./settle-integrations";

const integrations = [
  { id: "first", name: "First", kind: "mock" },
  { id: "second", name: "Second", kind: "mock" },
];

describe("settleIntegrationQueries", () => {
  it("retains successful integration results when another integration fails", async () => {
    const results = await settleIntegrationQueries(
      integrations,
      vi.fn(async (integration) => {
        if (integration.id === "first") throw new Error("offline");
        return integration.name;
      }),
      { throwOnAllFailure: true },
    );

    expect(results).toEqual(["Second"]);
  });

  it("retains fallback and successful results for a partial failure", async () => {
    const results = await settleIntegrationQueries(
      integrations,
      vi.fn(async (integration) => {
        if (integration.id === "first") throw new Error("offline");
        return integration.name;
      }),
      {
        throwOnAllFailure: true,
        fallback: (integration) => `${integration.name} unavailable`,
      },
    );

    expect(results).toEqual(["First unavailable", "Second"]);
  });

  it("throws when every integration fails and throwOnAllFailure is enabled", async () => {
    await expect(
      settleIntegrationQueries(
        integrations,
        vi.fn(async () => {
          throw new Error("offline");
        }),
        { throwOnAllFailure: true },
      ),
    ).rejects.toThrow("offline");
  });

  it("throws on total failure even when fallbacks are configured", async () => {
    await expect(
      settleIntegrationQueries(
        integrations,
        vi.fn(async () => {
          throw new Error("offline");
        }),
        {
          throwOnAllFailure: true,
          fallback: (integration) => `${integration.name} unavailable`,
        },
      ),
    ).rejects.toThrow("offline");
  });

  it("does not treat an empty integration list as a failure", async () => {
    await expect(
      settleIntegrationQueries(
        [],
        vi.fn(async () => "unused"),
        { throwOnAllFailure: true },
      ),
    ).resolves.toEqual([]);
  });
});

describe("getIntegrationQueryProvenance", () => {
  it("counts dropped and stale integration results independently", () => {
    expect(getIntegrationQueryProvenance(4, [{ isStale: false }, { isStale: true }, { isStale: true }])).toEqual({
      failedIntegrationCount: 1,
      staleIntegrationCount: 2,
    });
  });

  it("does not report failures for complete current results", () => {
    expect(getIntegrationQueryProvenance(2, [{ isStale: false }, {}])).toEqual({
      failedIntegrationCount: 0,
      staleIntegrationCount: 0,
    });
  });
});
