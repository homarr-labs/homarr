import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  snapshots: new Map<string, unknown>(),
  fetchStatsAsync: vi.fn(),
}));

vi.mock("@homarr/integrations/stats", () => ({
  fetchStatsAsync: mocks.fetchStatsAsync,
  getStatsMetrics: () => [
    { key: "healthy", label: "Healthy", unit: "count" },
    { key: "failed", label: "Failed", unit: "count" },
  ],
}));

vi.mock("@homarr/redis", () => ({
  getIntegrationCacheGenerationAsync: async () => ({ isShared: true, value: "generation" }),
  createGetSetChannel: (name: string) => ({
    getAsync: async () => mocks.snapshots.get(name),
  }),
  createLockChannel: () => ({
    acquireAsync: async () => "token",
    renewAsync: async () => true,
    releaseAsync: async () => undefined,
    setPersistentIfOwnedAsync: async (_token: string, name: string, snapshot: unknown) => {
      mocks.snapshots.set(name, snapshot);
    },
  }),
}));

vi.mock("./lib/integration-request-handler", () => ({
  getIntegrationCacheIdentity: ({ integration }: { integration: { id: string } }) => `identity:${integration.id}`,
}));

import { getDemoStatsValues, getStatsSnapshotAsync, mergeStatsValues, refreshStatsAsync } from "./stats";

const previousDemoMode = process.env.DEMO_MODE;

const integration = (id: string) => ({
  id,
  appId: null,
  kind: "mock" as const,
  name: id,
  url: `https://${id}.example.com`,
  externalUrl: null,
  decryptedSecrets: [],
});

const seedSnapshot = (id: string, values: Record<string, number>, updatedAt: number) => {
  mocks.snapshots.set(`integration-stats:snapshot:v1:${id}`, {
    identity: `identity:${id}`,
    values,
    unavailableMetrics: [],
    updatedAt,
    retryAt: 0,
    error: false,
  });
};

beforeEach(() => {
  mocks.snapshots.clear();
  mocks.fetchStatsAsync.mockReset();
});

afterEach(() => {
  if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = previousDemoMode;
});

describe("statistics snapshot updates", () => {
  test("updates successful metrics while retaining previous values for unavailable metrics", () => {
    expect(
      mergeStatsValues(
        ["healthy", "empty", "failed", "new"],
        { healthy: 1, empty: 4, failed: 2 },
        { healthy: 3, empty: null },
      ),
    ).toEqual({ healthy: 3, empty: null, failed: 2, new: null });
  });

  test("persists successful metric groups and schedules unavailable metrics for retry", async () => {
    const previousUpdatedAt = Date.now() - 10_000;
    seedSnapshot("partial", { healthy: 1, failed: 2 }, previousUpdatedAt);
    mocks.fetchStatsAsync.mockResolvedValue({ values: { healthy: 3 }, unavailableMetrics: ["failed"] });

    await refreshStatsAsync(integration("partial"), true);

    const snapshot = await getStatsSnapshotAsync(integration("partial"));
    expect(snapshot.values).toEqual({ healthy: 3, failed: 2 });
    expect(snapshot.unavailableMetrics).toEqual(["failed"]);
    expect(snapshot.updatedAt).toBeGreaterThan(previousUpdatedAt);
    expect(snapshot.retryAt).toBeGreaterThan(Date.now());
    expect(snapshot.error).toBe(false);
  });

  test("preserves the previous snapshot when every metric group fails", async () => {
    const previousUpdatedAt = Date.now() - 10_000;
    seedSnapshot("failed", { healthy: 1, failed: 2 }, previousUpdatedAt);
    mocks.fetchStatsAsync.mockRejectedValue(new AggregateError([new Error("offline")], "all failed"));

    await refreshStatsAsync(integration("failed"), true);

    const snapshot = await getStatsSnapshotAsync(integration("failed"));
    expect(snapshot.values).toEqual({ healthy: 1, failed: 2 });
    expect(snapshot.updatedAt).toBe(previousUpdatedAt);
    expect(snapshot.retryAt).toBeGreaterThan(Date.now());
    expect(snapshot.error).toBe(true);
  });

  test("refreshes one integration when another integration fails", async () => {
    const previousUpdatedAt = Date.now() - 10_000;
    seedSnapshot("offline", { healthy: 1, failed: 2 }, previousUpdatedAt);
    seedSnapshot("online", { healthy: 4, failed: 5 }, previousUpdatedAt);
    mocks.fetchStatsAsync.mockImplementation(async ({ id }: { id: string }) => {
      if (id === "offline") throw new Error("offline");
      return { values: { healthy: 6, failed: 7 }, unavailableMetrics: [] };
    });

    await Promise.all([
      refreshStatsAsync(integration("offline"), true),
      refreshStatsAsync(integration("online"), true),
    ]);

    const offline = await getStatsSnapshotAsync(integration("offline"));
    const online = await getStatsSnapshotAsync(integration("online"));
    expect(offline).toMatchObject({ values: { healthy: 1, failed: 2 }, updatedAt: previousUpdatedAt, error: true });
    expect(online.values).toEqual({ healthy: 6, failed: 7 });
    expect(online.updatedAt).toBeGreaterThan(previousUpdatedAt);
    expect(online.error).toBe(false);
  });
});

describe("demo integration statistics", () => {
  test("returns showcase values only for seeded demo sources", () => {
    process.env.DEMO_MODE = "true";

    expect(getDemoStatsValues({ kind: "sonarr", url: "https://demo.homarr.dev" })).toMatchObject({
      shows: 74,
      episodes: 3_986,
    });
    expect(getDemoStatsValues({ kind: "mealie", url: "https://demo.homarr.dev" })).toEqual({
      recipes: 318,
      users: 14,
      categories: 28,
      tags: 76,
    });
    expect(getDemoStatsValues({ kind: "spoolman", url: "https://demo.homarr.dev" })).toEqual({
      spools: 24,
      remainingWeight: 8_120,
    });
    expect(getDemoStatsValues({ kind: "sonarr", url: "https://sonarr.example.com" })).toBeUndefined();
    expect(getDemoStatsValues({ kind: "mock", url: "https://demo.homarr.dev" })).toBeUndefined();
  });

  test("serves seeded values through the read-only snapshot path", async () => {
    process.env.DEMO_MODE = "true";

    const snapshot = await getStatsSnapshotAsync({
      id: "demo-spoolman",
      appId: null,
      kind: "spoolman",
      name: "Spoolman",
      url: "https://demo.homarr.dev",
      externalUrl: null,
      decryptedSecrets: [],
    });

    expect(snapshot).toMatchObject({
      values: { spools: 24, remainingWeight: 8_120 },
      retryAt: 0,
      error: false,
      stale: false,
    });
    expect(snapshot.updatedAt).not.toBeNull();
  });

  test("does not replace live statistics outside demo mode", () => {
    process.env.DEMO_MODE = "false";

    expect(getDemoStatsValues({ kind: "sonarr", url: "https://demo.homarr.dev" })).toBeUndefined();
  });
});
