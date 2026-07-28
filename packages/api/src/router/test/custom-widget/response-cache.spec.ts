import { describe, expect, test, vi } from "vitest";

import { invalidateCustomWidgetResponseCache, withCustomWidgetResponseCache } from "../../custom-widget/response-cache";

const response = (calls: number) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  data: { calls },
});

describe("custom widget shared response cache", () => {
  test("deduplicates queries and invalidates them with a versioned namespace", async () => {
    const itemNamespace = "custom-jsx:test-item:";
    const namespace = `${itemNamespace}test-version:status:`;
    const input = {
      baseUrl: "https://example.com",
      method: "GET" as const,
      networkScope: "public" as const,
      kind: "query" as const,
      cacheKey: `${namespace}test-params`,
      cacheTtlSeconds: 60,
    };
    let calls = 0;
    const execute = async () => response(++calls);

    await expect(
      Promise.all([withCustomWidgetResponseCache(input, execute), withCustomWidgetResponseCache(input, execute)]),
    ).resolves.toEqual([response(1), response(1)]);
    await expect(withCustomWidgetResponseCache(input, execute)).resolves.toEqual(response(1));

    await invalidateCustomWidgetResponseCache([itemNamespace]);

    await expect(withCustomWidgetResponseCache(input, execute)).resolves.toEqual(response(2));
  });

  test("does not cache actions or zero-TTL queries", async () => {
    let calls = 0;
    const execute = async () => response(++calls);
    const baseInput = {
      baseUrl: "https://example.com",
      method: "GET" as const,
      networkScope: "public" as const,
      cacheKey: "custom-jsx:no-cache:version:status:params",
      cacheTtlSeconds: 0,
    };

    await withCustomWidgetResponseCache({ ...baseInput, kind: "query" }, execute);
    await withCustomWidgetResponseCache({ ...baseInput, kind: "query" }, execute);
    await withCustomWidgetResponseCache({ ...baseInput, kind: "action" }, execute);
    await withCustomWidgetResponseCache({ ...baseInput, kind: "action" }, execute);

    expect(calls).toBe(4);
  });

  test("does not retry a rejected query execution", async () => {
    const failure = new Error("upstream failed");
    const execute = vi.fn(async () => {
      throw failure;
    });
    const input = {
      baseUrl: "https://example.com",
      method: "GET" as const,
      networkScope: "public" as const,
      kind: "query" as const,
      cacheKey: "custom-jsx:rejected:version:status:params",
      cacheTtlSeconds: 60,
    };

    await expect(withCustomWidgetResponseCache(input, execute)).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledOnce();
  });

  test("does not retry a synchronous query execution failure", async () => {
    const failure = new Error("failed before returning a promise");
    const execute = vi.fn(() => {
      throw failure;
    });
    const input = {
      baseUrl: "https://example.com",
      method: "GET" as const,
      networkScope: "public" as const,
      kind: "query" as const,
      cacheKey: "custom-jsx:synchronous-failure:version:status:params",
      cacheTtlSeconds: 60,
    };

    await expect(withCustomWidgetResponseCache(input, execute)).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledOnce();
  });
});
