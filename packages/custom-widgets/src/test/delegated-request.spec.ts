import { describe, expect, test, vi } from "vitest";

import { executeCustomWidgetRequest } from "../server";

describe("delegated Custom Widget requests", () => {
  test("delegates validated operations and reauthorizes every read instead of caching worker responses", async () => {
    const executeDelegatedRequest = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK", data: 7 });
    const input = {
      baseUrl: "https://federated.invalid/",
      targetUrl: "https://federated.invalid/api/status?limit=4",
      method: "GET" as const,
      kind: "query" as const,
      networkScope: "loopback" as const,
      staticHeaders: { Accept: "application/json" },
      cacheKey: "delegated-regression",
      cacheTtlSeconds: 300,
      executeDelegatedRequest,
    };
    await expect(executeCustomWidgetRequest(input)).resolves.toMatchObject({ data: 7 });
    await expect(executeCustomWidgetRequest(input)).resolves.toMatchObject({ data: 7 });
    expect(executeDelegatedRequest).toHaveBeenCalledTimes(2);
    expect(executeDelegatedRequest.mock.calls[0]?.[0]).toEqual({
      path: "/api/status?limit=4",
      method: "GET",
      kind: "query",
      staticHeaders: { Accept: "application/json" },
    });
    expect(executeDelegatedRequest.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  test.each([
    { staticHeaders: { Cookie: "a=1" } },
    { body: "x".repeat(10 * 1024 + 1) },
    { targetUrl: "https://another.invalid/api" },
    { pathPrefix: "/api", targetUrl: "https://federated.invalid/admin" },
  ])("rejects unsafe operations before forwarding: %j", async (unsafe) => {
    const executeDelegatedRequest = vi.fn();
    await expect(
      executeCustomWidgetRequest({
        baseUrl: "https://federated.invalid/",
        method: "GET",
        kind: "query",
        networkScope: "loopback",
        executeDelegatedRequest,
        ...unsafe,
      }),
    ).rejects.toMatchObject({ code: expect.stringMatching(/BAD_REQUEST|PAYLOAD_TOO_LARGE|FORBIDDEN/u) });
    expect(executeDelegatedRequest).not.toHaveBeenCalled();
  });

  test("preserves action payloads and forwards cancellation without local connection credentials", async () => {
    const abort = new AbortController();
    let forwardedSignal: AbortSignal | undefined;
    const executeDelegatedRequest = vi.fn((_operation, signal: AbortSignal) => {
      forwardedSignal = signal;
      return Promise.resolve({ ok: true, status: 204, statusText: "No Content", data: null });
    });
    await executeCustomWidgetRequest({
      baseUrl: "https://federated.invalid/",
      targetUrl: "https://federated.invalid/queue/remove",
      method: "POST",
      kind: "action",
      body: '{"id":7}',
      networkScope: "loopback",
      auth: { type: "bearer", secrets: [{ kind: "apiKey", value: "must-not-forward" }] },
      resolveConnectionAsync: () => {
        throw new Error("Must execute on the source worker");
      },
      executeDelegatedRequest,
      signal: abort.signal,
    });
    expect(executeDelegatedRequest.mock.calls[0]?.[0]).toEqual({
      path: "/queue/remove",
      method: "POST",
      kind: "action",
      body: '{"id":7}',
    });
    abort.abort();
    expect(forwardedSignal?.aborted).toBe(true);
  });

  test("aborts an unresponsive source within the total request deadline", async () => {
    vi.useFakeTimers();
    try {
      const request = executeCustomWidgetRequest({
        baseUrl: "https://federated.invalid/",
        method: "GET",
        kind: "query",
        networkScope: "loopback",
        timeoutMs: 20,
        executeDelegatedRequest: () => new Promise(() => {}),
      });
      const rejection = expect(request).rejects.toMatchObject({ code: "BAD_GATEWAY", reason: "timeout" });
      await vi.advanceTimersByTimeAsync(21);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
