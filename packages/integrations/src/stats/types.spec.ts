// @vitest-environment node

import { afterEach, describe, expect, test, vi } from "vitest";

import { StatsIntegration } from "./stats-integration";

import { createStatsRequestSignal, fetchStatsGroupsAsync } from "./types";

vi.hoisted(() => {
  process.env.DB_DRIVER ??= "better-sqlite3";
  process.env.DB_URL ??= ":memory:";
  process.env.SECRET_ENCRYPTION_KEY ??= "0".repeat(64);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchStatsGroupsAsync", () => {
  test("returns successful metrics and identifies only the failed group", async () => {
    const result = await fetchStatsGroupsAsync([
      { metrics: ["healthy"], fetchAsync: async () => ({ healthy: 42 }) },
      { metrics: ["failed", "alsoFailed"], fetchAsync: async () => await Promise.reject(new Error("offline")) },
    ]);

    expect(result).toEqual({ values: { healthy: 42 }, unavailableMetrics: ["failed", "alsoFailed"] });
  });

  test("rejects when every metric group fails", async () => {
    await expect(
      fetchStatsGroupsAsync([
        { metrics: ["first"], fetchAsync: async () => await Promise.reject(new Error("first")) },
        { metrics: ["second"], fetchAsync: async () => await Promise.reject(new Error("second")) },
      ]),
    ).rejects.toThrow("All statistics requests failed");
  });

  test("keeps a healthy group when the default request deadline aborts a stalled sibling", async () => {
    const originalTimeout = AbortSignal.timeout;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      if (milliseconds === 30_000) return originalTimeout(10);
      return originalTimeout(milliseconds);
    });
    const sourceController = new AbortController();
    const stalled = async () => {
      const signal = createStatsRequestSignal(sourceController.signal);
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
      return { stalled: 1 };
    };

    const result = await fetchStatsGroupsAsync([
      { metrics: ["healthy"], fetchAsync: async () => ({ healthy: 42 }) },
      { metrics: ["stalled"], fetchAsync: stalled },
    ]);

    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(sourceController.signal.aborted).toBe(false);
    expect(result).toEqual({ values: { healthy: 42 }, unavailableMetrics: ["stalled"] });
  });
});

test("rejects caller cancellation even when a provider returns partial metrics", async () => {
  const controller = new AbortController();
  const reason = new Error("Caller cancelled");
  const integration = new StatsIntegration(
    { id: "stats", name: "Stats", url: "http://localhost", externalUrl: null, decryptedSecrets: [] },
    {
      metrics: [],
      fetchAsync: async () => {
        controller.abort(reason);
        return { values: { healthy: 42 }, unavailableMetrics: ["cancelled"] };
      },
    },
  );
  await expect(integration.getStatsAsync(controller.signal)).rejects.toMatchObject({ cause: reason });
});
