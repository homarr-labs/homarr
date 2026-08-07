import { afterEach, describe, expect, test, vi } from "vitest";

import { getCachedIntegrationData, invalidateIntegrationDataCache } from "./integration-data-cache";

afterEach(() => {
  invalidateIntegrationDataCache("integration-a");
  invalidateIntegrationDataCache("integration-b");
});

describe("getCachedIntegrationData", () => {
  test("returns cached data within TTL without refetching", async () => {
    const fetcher = vi.fn(async () => ({ value: 1 }));

    await expect(getCachedIntegrationData("integration-a", "widget:procedure", fetcher, 60_000)).resolves.toEqual({
      value: 1,
    });
    await expect(getCachedIntegrationData("integration-a", "widget:procedure", fetcher, 60_000)).resolves.toEqual({
      value: 1,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("serves stale data while revalidating after TTL", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ value: 2 }), 100)));

    await getCachedIntegrationData("integration-a", "widget:stale", fetcher, 50);
    vi.advanceTimersByTime(60);

    const staleResult = await getCachedIntegrationData("integration-a", "widget:stale", fetcher, 50);
    expect(staleResult).toEqual({ value: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(100);
    await expect(getCachedIntegrationData("integration-a", "widget:stale", fetcher, 50)).resolves.toEqual({ value: 2 });

    vi.useRealTimers();
  });

  test("throws on initial fetch failure when no stale data exists", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("upstream down"));
    await expect(getCachedIntegrationData("integration-a", "q1", fetcher)).rejects.toThrow("upstream down");
  });

  test("returns stale data when refetch fails", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new Error("upstream unavailable"));

    await getCachedIntegrationData("integration-a", "widget:error", fetcher, 50);
    vi.advanceTimersByTime(60);

    await expect(getCachedIntegrationData("integration-a", "widget:error", fetcher, 50)).resolves.toEqual({
      value: 1,
    });

    vi.useRealTimers();
  });

  test("concurrent cold-cache calls coalesce into one fetch, never return undefined", async () => {
    let resolveOuter!: (v: { value: number }) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<{ value: number }>((resolve) => {
          resolveOuter = resolve;
        }),
    );

    const p1 = getCachedIntegrationData("integration-a", "widget:concurrent", fetcher);
    const p2 = getCachedIntegrationData("integration-a", "widget:concurrent", fetcher);

    resolveOuter({ value: 42 });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ value: 42 });
    expect(r2).toEqual({ value: 42 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("invalidation during pending fetch prevents stale write-back", async () => {
    let resolveOuter!: (v: { value: string }) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<{ value: string }>((resolve) => {
          resolveOuter = resolve;
        }),
    );

    const p1 = getCachedIntegrationData("integration-a", "widget:race", fetcher);

    invalidateIntegrationDataCache("integration-a");
    resolveOuter({ value: "stale" });
    await p1;

    const freshFetcher = vi.fn(async () => ({ value: "fresh" }));
    const result = await getCachedIntegrationData("integration-a", "widget:race", freshFetcher);
    expect(result).toEqual({ value: "fresh" });
    expect(freshFetcher).toHaveBeenCalledTimes(1);
  });

  test("invalidates all cache entries for an integration", async () => {
    const fetcherOne = vi.fn(async () => ({ value: "one" }));
    const fetcherTwo = vi.fn(async () => ({ value: "two" }));
    const fetcherOther = vi.fn(async () => ({ value: "other" }));

    await getCachedIntegrationData("integration-a", "widget:one", fetcherOne);
    await getCachedIntegrationData("integration-a", "widget:two", fetcherTwo);
    await getCachedIntegrationData("integration-b", "widget:one", fetcherOther);

    invalidateIntegrationDataCache("integration-a");

    await getCachedIntegrationData("integration-a", "widget:one", fetcherOne);
    await getCachedIntegrationData("integration-a", "widget:two", fetcherTwo);
    await getCachedIntegrationData("integration-b", "widget:one", fetcherOther);

    expect(fetcherOne).toHaveBeenCalledTimes(2);
    expect(fetcherTwo).toHaveBeenCalledTimes(2);
    expect(fetcherOther).toHaveBeenCalledTimes(1);
  });
});
