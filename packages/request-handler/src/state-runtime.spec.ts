import { afterEach, describe, expect, test, vi } from "vitest";

import { createStateChannels, createStateGenerations } from "@homarr/redis/state";
import { createStateBackingFixture } from "../../redis/src/state/state.fixture";

import { createStatisticsSnapshotService } from "./stats-runtime";
import type { StatisticsInput } from "./stats-runtime";
import { createUpdateStateService } from "./update-checker-state";
import { createRequestHandler } from "./lib/request-handler";

afterEach(() => vi.useRealTimers());

const integration: StatisticsInput = {
  id: "source",
  kind: "sonarr",
  name: "Disposable",
  url: "https://invalid.example",
  appId: null,
  externalUrl: null,
  decryptedSecrets: [],
};

describe("source-owned snapshot state", () => {
  test("update denial wins before provider dispatch and after cached, concurrent, failed and successful pending work", async () => {
    vi.useFakeTimers();
    const phases = ["pre-provider", "cached", "concurrent", "failure", "success", "failure-read", "return"] as const;
    for (const phase of phases) {
      const backing = createStateBackingFixture();
      const initialChannels = createStateChannels(backing);
      const freshKey = "update-checker:fresh:v2:2.4.1";
      const staleKey = "update-checker:stale:v2:2.4.1";
      const lockKey = "update-checker:lock:v2:2.4.1";
      const previous = { availableUpdates: ["v3"], attemptedAt: 1, checkedAt: 1 };
      if (phase === "cached" || phase === "return")
        await initialChannels.createGetSetChannel(freshKey).setAsync(previous);
      if (phase === "failure" || phase === "failure-read")
        await initialChannels.createGetSetChannel(staleKey).setAsync(previous);
      if (phase === "concurrent") await initialChannels.createLockChannel(lockKey).acquireAsync(120);
      let allowed = true;
      let freshReads = 0;
      let staleReads = 0;
      const resultWrites: string[] = [];
      const channels = createStateChannels({
        readAsync: async (keys, operation) => {
          const snapshot = await backing.readAsync(keys, operation);
          if (keys.includes(freshKey)) {
            freshReads += 1;
            if (phase === "cached" || (phase === "concurrent" && freshReads === 2)) allowed = false;
            if (phase === "concurrent" && freshReads === 2)
              return { ...snapshot, values: { ...snapshot.values, [freshKey]: JSON.stringify({ json: previous }) } };
          }
          if (keys.includes(staleKey)) {
            staleReads += 1;
            if (phase === "failure-read" && staleReads === 2) allowed = false;
          }
          if (phase === "return" && keys.includes(freshKey))
            queueMicrotask(() => {
              allowed = false;
            });
          return snapshot;
        },
        mutateAsync: async (mutation, operation) => {
          const result = await backing.mutateAsync(mutation, operation);
          for (const write of mutation.writes) {
            if (write.key === freshKey || write.key === staleKey) resultWrites.push(write.key);
          }
          if (
            phase === "pre-provider" &&
            mutation.writes.some((write) => write.key === lockKey && write.kind === "set")
          )
            allowed = false;
          return result;
        },
      });
      const provider = vi.fn(async (): Promise<string[]> => {
        if (phase === "failure" || phase === "success") allowed = false;
        if (phase === "failure" || phase === "failure-read") throw new Error("Disposable provider failure");
        return ["v4"];
      });
      const service = createUpdateStateService({
        channels,
        diagnostics: { warn: vi.fn() },
        currentVersion: "2.4.1",
        isExternalConnectionAllowed: () => allowed,
        getAvailableUpdatesAsync: provider,
      });
      const startedAt = Date.now();
      const pending = service.handler({}).getDataAsync();
      await vi.advanceTimersByTimeAsync(100);
      const response = await pending;
      expect.soft(response.data, phase).toEqual({ availableUpdates: [] });
      expect.soft(response.timestamp.getTime(), phase).toBeGreaterThanOrEqual(startedAt);
      expect.soft(response.timestamp.getTime(), phase).toBeLessThanOrEqual(Date.now());
      expect.soft(resultWrites, phase).toEqual([]);
      expect
        .soft(provider, phase)
        .toHaveBeenCalledTimes(phase === "failure" || phase === "success" || phase === "failure-read" ? 1 : 0);
      service.stop();
    }
  });
  test("stopping the actual bounded handler aborts upstream and rejects late settlements and subsequent reads", async () => {
    vi.useFakeTimers();
    let complete: ((value: string) => void) | undefined;
    let upstreamSignal: AbortSignal | undefined;
    const handler = createRequestHandler({
      requestTimeoutMs: 100,
      requestAsync: async (_input: Record<string, unknown>, signal) => {
        upstreamSignal = signal;
        return await new Promise<string>((resolve) => {
          complete = resolve;
        });
      },
    });
    const request = handler.handler({ id: "source" }).getDataAsync();
    const rejected = expect(request).rejects.toThrow("Request handler is stopped");
    const stop = handler.stopAsync();
    expect(upstreamSignal?.aborted).toBe(true);
    await rejected;
    await vi.advanceTimersByTimeAsync(100);
    await stop;
    complete?.("late");
    await expect(handler.handler({ id: "source" }).getDataAsync()).rejects.toThrow("Request handler is stopped");
  });
  test("provider failure retains last-good values and timestamp while recording error, retry and stale status", async () => {
    vi.useFakeTimers();
    const backing = createStateBackingFixture();
    const channels = createStateChannels(backing);
    const generations = createStateGenerations(backing, { warn: vi.fn() });
    const fetchStatsAsync = vi.fn(async () => ({ shows: 7 }));
    const service = createStatisticsSnapshotService({
      channels,
      generations,
      diagnostics: { warn: vi.fn() },
      getIdentity: () => "configuration",
      fetchStatsAsync,
      getStatsMetrics: () => [{ key: "shows" }],
      getDemoStatsValues: () => undefined,
    });
    await service.refreshStatsAsync(integration, false);
    const first = await service.getStatsSnapshotAsync(integration);
    await vi.advanceTimersByTimeAsync(3_600_000);
    fetchStatsAsync.mockRejectedValueOnce(new Error("Provider unavailable"));
    await service.refreshStatsAsync(integration, false);
    await expect(service.getStatsSnapshotAsync(integration)).resolves.toEqual({
      values: { shows: 7 },
      updatedAt: first.updatedAt,
      error: true,
      retryAt: Date.now() + 60_000,
      stale: true,
    });
    await service.stopAsync();
    generations.stop();
  });

  test("a statistics result settling after credential invalidation cannot restore removed private last-good data", async () => {
    const backing = createStateBackingFixture();
    const channels = createStateChannels(backing);
    const generations = createStateGenerations(backing, { warn: vi.fn() });
    let complete: ((value: Record<string, number>) => void) | undefined;
    const fetchStatsAsync = vi.fn(
      async () =>
        await new Promise<Record<string, number>>((resolve) => {
          complete = resolve;
        }),
    );
    const service = createStatisticsSnapshotService({
      channels,
      generations,
      diagnostics: { warn: vi.fn() },
      getIdentity: () => "configuration",
      fetchStatsAsync,
      getStatsMetrics: () => [{ key: "shows" }],
      getDemoStatsValues: () => undefined,
    });
    const refresh = service.refreshStatsAsync(integration, false);
    await vi.waitFor(() => expect(fetchStatsAsync).toHaveBeenCalledOnce());
    await generations.invalidateIntegrationCacheAsync(integration.id);
    complete?.({ shows: 99 });
    await refresh;
    await expect(
      channels.createGetSetChannel(`integration-stats:snapshot:v1:${integration.id}`).getAsync(),
    ).resolves.toBeNull();
    await service.stopAsync();
    generations.stop();
  });

  test("update state keeps a persistent stale release while suppressing failure retries for 24 hours and obeying external-connection denial", async () => {
    vi.useFakeTimers();
    const channels = createStateChannels(createStateBackingFixture());
    const provider = vi.fn(async () => ["v3"]);
    let allowed = true;
    const service = createUpdateStateService({
      channels,
      diagnostics: { warn: vi.fn() },
      currentVersion: "2.4.1",
      isExternalConnectionAllowed: () => allowed,
      getAvailableUpdatesAsync: provider,
    });
    const initial = await service.handler({}).getDataAsync();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    provider.mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(service.handler({}).getDataAsync()).resolves.toEqual(initial);
    await service.handler({}).getDataAsync();
    expect(provider).toHaveBeenCalledTimes(2);
    allowed = false;
    await expect(service.handler({}).getDataAsync()).resolves.toMatchObject({ data: { availableUpdates: [] } });
    expect(provider).toHaveBeenCalledTimes(2);
    service.stop();
  });
});
