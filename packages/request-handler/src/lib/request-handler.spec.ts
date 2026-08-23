import { afterEach, describe, expect, it, vi } from "vitest";

import type { Integration, IntegrationSecret } from "@homarr/db/schema";

import { createIntegrationRequestHandler } from "./integration-request-handler";
import type { SharedCacheAdapter } from "./request-handler";
import { createRequestHandler } from "./request-handler";
import { createWidgetRequestHandler } from "./widget-request-handler";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createIntegration = (secret: string) =>
  ({
    id: "integration-id",
    kind: "sonarr",
    decryptedSecrets: [{ kind: "apiKey", value: secret }],
  }) as Omit<Integration, "kind"> & {
    kind: "sonarr";
    decryptedSecrets: Pick<IntegrationSecret, "kind" | "value">[];
    externalUrl: string | null;
  };

afterEach(() => {
  vi.useRealTimers();
});

describe("createRequestHandler", () => {
  it("deduplicates in-flight work and caches completed data", async () => {
    let calls = 0;
    const request = deferred<string>();
    const handler = createRequestHandler({
      requestAsync: async () => {
        calls += 1;
        return await request.promise;
      },
    });

    const first = handler.handler({ id: "same" }).getDataAsync();
    const second = handler.handler({ id: "same" }).getDataAsync();
    expect(calls).toBe(1);

    request.resolve("value");
    await expect(Promise.all([first, second])).resolves.toMatchObject([{ data: "value" }, { data: "value" }]);
    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: "value" });
    expect(calls).toBe(1);
  });

  it("uses a fresh shared cache entry before calling the upstream service", async () => {
    const timestamp = new Date();
    const requestAsync = vi.fn(async () => "upstream");
    const sharedCache = {
      generation: "shared-1",
      isShared: true,
      getAsync: vi.fn(async () => ({
        data: "shared",
        timestamp,
        expiresAt: Date.now() + 1_000,
        staleUntil: Date.now() + 1_000,
      })),
      setAsync: vi.fn(async () => undefined),
      acquireRefreshLockAsync: vi.fn(async () => "lock"),
      releaseRefreshLockAsync: vi.fn(async () => undefined),
    };
    const handler = createRequestHandler({
      cacheTtlMs: 1_000,
      requestAsync,
      getSharedCacheAsync: async () => sharedCache,
    });

    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: "shared", timestamp });
    expect(requestAsync).not.toHaveBeenCalled();
    expect(sharedCache.acquireRefreshLockAsync).not.toHaveBeenCalled();
  });

  it("deduplicates while the shared cache is being resolved", async () => {
    const sharedCacheRequest = deferred<SharedCacheAdapter<string>>();
    const upstreamRequest = deferred<string>();
    const getSharedCacheAsync = vi.fn(async () => await sharedCacheRequest.promise);
    const requestAsync = vi.fn(async () => await upstreamRequest.promise);
    const handler = createRequestHandler({
      cacheTtlMs: 1_000,
      requestAsync,
      getSharedCacheAsync,
    });

    const first = handler.handler({ id: "same" }).getDataAsync();
    const second = handler.handler({ id: "same" }).getDataAsync();
    expect(getSharedCacheAsync).toHaveBeenCalledTimes(1);

    sharedCacheRequest.resolve({
      generation: "shared-1",
      isShared: false,
      getAsync: async () => undefined,
      setAsync: async () => undefined,
      acquireRefreshLockAsync: async () => undefined,
      releaseRefreshLockAsync: async () => undefined,
    });
    await vi.waitFor(() => expect(requestAsync).toHaveBeenCalledTimes(1));
    upstreamRequest.resolve("value");

    await expect(Promise.all([first, second])).resolves.toMatchObject([{ data: "value" }, { data: "value" }]);
  });

  it("keeps in-flight deduplication but retains no payload when ttl is zero", async () => {
    let calls = 0;
    const request = deferred<{ call: number }>();
    const handler = createRequestHandler({
      cacheTtlMs: 0,
      requestAsync: async () => {
        calls += 1;
        if (calls === 1) return await request.promise;
        return { call: calls };
      },
    });

    const first = handler.handler({ id: "same" }).getDataAsync();
    const second = handler.handler({ id: "same" }).getDataAsync();
    expect(calls).toBe(1);

    request.resolve({ call: 1 });
    await expect(Promise.all([first, second])).resolves.toMatchObject([{ data: { call: 1 } }, { data: { call: 1 } }]);
    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: { call: 2 } });
    expect(calls).toBe(2);
  });

  it("releases positive-ttl entries after expiry without another request", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const handler = createRequestHandler({
      cacheTtlMs: 25,
      requestAsync: async () => ({ call: ++calls }),
    });

    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: { call: 1 } });
    await vi.advanceTimersByTimeAsync(25);
    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: { call: 2 } });

    expect(calls).toBe(2);
  });

  it("cancels scheduled expiry work when the cache is invalidated", async () => {
    vi.useFakeTimers();
    const handler = createRequestHandler({ cacheTtlMs: 25, requestAsync: async () => "value" });
    await handler.handler({ id: "same" }).getDataAsync();

    expect(vi.getTimerCount()).toBe(1);
    handler.invalidateCache();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds stale-on-error fallback and releases it while idle", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const handler = createRequestHandler({
      cacheTtlMs: 25,
      fallbackToStaleOnError: true,
      staleIfErrorTtlMs: 50,
      requestAsync: async () => {
        calls += 1;
        if (calls === 1) return "last-known-good";
        throw new Error("upstream unavailable");
      },
    });

    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({
      data: "last-known-good",
    });
    await vi.advanceTimersByTimeAsync(25);
    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({
      data: "last-known-good",
    });

    await vi.advanceTimersByTimeAsync(51);
    await expect(handler.handler({ id: "same" }).getDataAsync()).rejects.toThrow("upstream unavailable");
    expect(calls).toBe(3);
  });

  it("reschedules staggered stale entries by their retirement deadline without spinning", async () => {
    vi.useFakeTimers();
    const handler = createRequestHandler({
      cacheTtlMs: 10,
      fallbackToStaleOnError: true,
      staleIfErrorTtlMs: 100,
      requestAsync: async ({ id }: { id: string }) => id,
    });

    await handler.handler({ id: "first" }).getDataAsync();
    await vi.advanceTimersByTimeAsync(20);
    await handler.handler({ id: "second" }).getDataAsync();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(90);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("evicts an empty-string cache key at the size limit", async () => {
    let calls = 0;
    const handler = createRequestHandler({
      cacheTtlMs: 60_000,
      getCacheKey: ({ id }: { id: string }) => id,
      requestAsync: async () => ++calls,
    });

    await handler.handler({ id: "" }).getDataAsync();
    for (let index = 0; index < 1000; index += 1) {
      await handler.handler({ id: String(index) }).getDataAsync();
    }
    await handler.handler({ id: "" }).getDataAsync();

    expect(calls).toBe(1002);
  });

  it("does not let a pre-invalidation request repopulate or clear newer work", async () => {
    const staleRequest = deferred<string>();
    const freshRequest = deferred<string>();
    const requests = [staleRequest, freshRequest];
    let calls = 0;
    const handler = createRequestHandler({
      requestAsync: async () => {
        const request = requests[calls++];
        if (!request) throw new Error("Unexpected request");
        return await request.promise;
      },
    });

    const stale = handler.handler({ id: "same" }).getDataAsync();
    handler.invalidateCache();
    const fresh = handler.handler({ id: "same" }).getDataAsync();

    staleRequest.resolve("stale");
    await expect(stale).resolves.toMatchObject({ data: "stale" });
    const joinsFresh = handler.handler({ id: "same" }).getDataAsync();
    expect(calls).toBe(2);

    freshRequest.resolve("fresh");
    await expect(Promise.all([fresh, joinsFresh])).resolves.toMatchObject([{ data: "fresh" }, { data: "fresh" }]);
    await expect(handler.handler({ id: "same" }).getDataAsync()).resolves.toMatchObject({ data: "fresh" });
    expect(calls).toBe(2);
  });
});

describe("createIntegrationRequestHandler", () => {
  it("keys requests by integration id and options without retaining secret values", async () => {
    let calls = 0;
    const request = deferred<string>();
    const handler = createIntegrationRequestHandler<string, "sonarr", { page: number }>({
      requestAsync: async () => {
        calls += 1;
        return await request.promise;
      },
    });
    const first = handler.handler(createIntegration("first-secret"), { page: 1 }).getDataAsync();
    const second = handler.handler(createIntegration("rotated-secret"), { page: 1 }).getDataAsync();
    expect(calls).toBe(1);

    request.resolve("value");
    await expect(Promise.all([first, second])).resolves.toMatchObject([{ data: "value" }, { data: "value" }]);
  });
});

describe("createWidgetRequestHandler", () => {
  it("shares its cache across calls while keeping distinct inputs separate", async () => {
    let calls = 0;
    const handler = createWidgetRequestHandler({ requestAsync: async ({ id }: { id: string }) => `${id}-${++calls}` });

    await expect(handler.handler({ id: "one" }).getDataAsync()).resolves.toMatchObject({ data: "one-1" });
    await expect(handler.handler({ id: "one" }).getDataAsync()).resolves.toMatchObject({ data: "one-1" });
    await expect(handler.handler({ id: "two" }).getDataAsync()).resolves.toMatchObject({ data: "two-2" });
    expect(calls).toBe(2);
  });
});
