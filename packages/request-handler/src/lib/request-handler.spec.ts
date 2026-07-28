// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createRequestHandler } from "./request-handler";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

describe("createRequestHandler", () => {
  test("keeps the standard result contract free of cache provenance", async () => {
    const requestHandler = createRequestHandler({
      requestAsync: vi.fn().mockResolvedValue("current"),
    });

    const result = await requestHandler.handler({ integrationId: "first" }).getDataAsync();

    expect(result).toMatchObject({ data: "current", timestamp: expect.any(Date) });
    expect(result).not.toHaveProperty("isStale");
  });

  test("marks an expired cache fallback as stale while preserving its timestamp", async () => {
    const requestAsync = vi.fn().mockResolvedValueOnce("cached").mockRejectedValueOnce(new Error("offline"));
    const requestHandler = createRequestHandler({
      requestAsync,
      cacheTtlMs: 0,
      fallbackToStaleOnError: true,
    });
    const handler = requestHandler.handler({ integrationId: "first" });

    const fresh = await handler.getDataWithProvenanceAsync();
    const fallback = await handler.getDataWithProvenanceAsync();

    expect(fresh).toMatchObject({ data: "cached", isStale: false });
    expect(fallback).toEqual({
      data: "cached",
      timestamp: fresh.timestamp,
      isStale: true,
    });
    expect(requestAsync).toHaveBeenCalledTimes(2);
  });

  test("does not hide an initial error when no cache exists", async () => {
    const requestHandler = createRequestHandler({
      requestAsync: vi.fn().mockRejectedValue(new Error("offline")),
      fallbackToStaleOnError: true,
    });

    await expect(requestHandler.handler({ integrationId: "first" }).getDataWithProvenanceAsync()).rejects.toThrow(
      "offline",
    );
  });

  test("does not let a pre-invalidation request overwrite a newer cached result", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const requestAsync = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const requestHandler = createRequestHandler({ requestAsync });
    const handler = requestHandler.handler({ integrationId: "first" });

    const oldRequest = handler.getDataWithProvenanceAsync();
    requestHandler.invalidateCache();
    const newRequest = handler.getDataWithProvenanceAsync();

    second.resolve("new");
    await expect(newRequest).resolves.toMatchObject({ data: "new" });
    first.resolve("old");
    await expect(oldRequest).resolves.toMatchObject({ data: "old" });

    await expect(handler.getDataWithProvenanceAsync()).resolves.toMatchObject({ data: "new" });
    expect(requestAsync).toHaveBeenCalledTimes(2);
  });

  test("does not let a pre-invalidation request clear a newer inflight request", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const requestAsync = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const requestHandler = createRequestHandler({ requestAsync });
    const handler = requestHandler.handler({ integrationId: "first" });

    const oldRequest = handler.getDataWithProvenanceAsync();
    requestHandler.invalidateCache();
    const newRequest = handler.getDataWithProvenanceAsync();

    first.resolve("old");
    await expect(oldRequest).resolves.toMatchObject({ data: "old" });
    const sharedNewRequest = handler.getDataWithProvenanceAsync();
    expect(requestAsync).toHaveBeenCalledTimes(2);

    second.resolve("new");
    await expect(Promise.all([newRequest, sharedNewRequest])).resolves.toEqual([
      expect.objectContaining({ data: "new" }),
      expect.objectContaining({ data: "new" }),
    ]);
  });
});
