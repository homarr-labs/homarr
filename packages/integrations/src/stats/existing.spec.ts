import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentSignal: undefined as AbortSignal | undefined,
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  withHttpRequestSignalAsync: async <T>(signal: AbortSignal, operation: () => Promise<T>) => {
    mocks.currentSignal = signal;
    return await operation();
  },
}));

vi.mock("../factory", () => ({
  createIntegrationAsync: async () => ({
    getLibraryStatsAsync: async () => ({
      shows: 4,
      monitored: 3,
      downloaded: 20,
      storage: 100,
      episodes: 24,
    }),
    getMissingAsync: async () => {
      const signal = mocks.currentSignal;
      return await new Promise<{ totalCount: number }>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
    getMediaQueueAsync: async () => ({ totalCount: 2 }),
  }),
}));

import { existingStatsProviders } from "./existing";

afterEach(() => {
  vi.restoreAllMocks();
  mocks.currentSignal = undefined;
});

describe("grouped legacy statistics", () => {
  test("keeps healthy groups when one legacy request reaches its group deadline", async () => {
    const originalTimeout = AbortSignal.timeout;
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      if (milliseconds === 30_000) return originalTimeout(10);
      return originalTimeout(milliseconds);
    });
    const provider = existingStatsProviders.sonarr;
    if (!provider) throw new Error("Expected Sonarr statistics provider");

    const result = await provider.fetchAsync(
      {
        id: "sonarr-timeout",
        name: "Sonarr",
        url: "https://sonarr.example.com",
        externalUrl: null,
        decryptedSecrets: [],
      },
      AbortSignal.timeout(1_000),
    );

    expect(result).toEqual({
      values: { shows: 4, monitored: 3, downloaded: 20, storage: 100, episodes: 24, queued: 2 },
      unavailableMetrics: ["missing"],
    });
  });
});
