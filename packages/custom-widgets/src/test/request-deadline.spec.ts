import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as NetworkPolicy from "../server/network-policy";
import type { CustomWidgetHttpRequest } from "../server/request-executor";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  createPinnedAgent: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("../server/network-policy", async (importOriginal) => {
  const actual = await importOriginal<typeof NetworkPolicy>();
  return { ...actual, createPinnedAgent: mocks.createPinnedAgent };
});

import { executeCustomWidgetRequest, MAX_REQUEST_DURATION_MS } from "../server/request-executor";
import { resolveAndValidateHost } from "../server/network-policy";

const query = {
  baseUrl: "https://example.com",
  method: "GET",
  networkScope: "public",
  kind: "query",
} satisfies CustomWidgetHttpRequest;

describe("custom widget request deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.lookup.mockReset();
    mocks.createPinnedAgent.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns at the total deadline when DNS resolution stalls", async () => {
    mocks.lookup.mockReturnValue(new Promise(() => undefined));
    const assertion = expect(executeCustomWidgetRequest(query)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      reason: "timeout",
    });

    await vi.advanceTimersByTimeAsync(MAX_REQUEST_DURATION_MS);

    await assertion;
    expect(mocks.createPinnedAgent).not.toHaveBeenCalled();
  });

  it("cancels an injected stalled resolver when its deadline aborts", async () => {
    const controller = new AbortController();
    const resolver = vi.fn(() => new Promise<never>(() => undefined));
    const assertion = expect(
      resolveAndValidateHost("example.com", "public", { signal: controller.signal, resolver }),
    ).rejects.toMatchObject({ name: "AbortError" });

    controller.abort();

    await assertion;
    expect(resolver).toHaveBeenCalledWith("example.com");
  });

  it("detaches stalled dispatcher cleanup after a bounded grace period", async () => {
    const close = vi.fn(() => new Promise<void>(() => undefined));
    const destroy = vi.fn(async () => undefined);
    mocks.createPinnedAgent.mockReturnValue({
      request: vi.fn(async () => ({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          arrayBuffer: vi.fn(async () => new TextEncoder().encode("{}").buffer),
        },
      })),
      close,
      destroy,
    });
    const logError = vi.fn();
    const request = executeCustomWidgetRequest({
      ...query,
      baseUrl: "http://127.0.0.1",
      networkScope: "loopback",
      logError,
    });

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(request).resolves.toMatchObject({ ok: true, status: 200, data: {} });
    expect(close).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorName: "DispatcherCloseTimeout",
      }),
    );
  });

  it("does not turn a completed action into a failure when dispatcher cleanup rejects", async () => {
    const closeFailure = Object.assign(new Error("cleanup failed"), { name: "DispatcherCloseError" });
    const close = vi.fn(async () => {
      throw closeFailure;
    });
    const destroy = vi.fn(async () => undefined);
    mocks.createPinnedAgent.mockReturnValue({
      request: vi.fn(async () => ({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          arrayBuffer: vi.fn(async () => new TextEncoder().encode('{"updated":true}').buffer),
        },
      })),
      close,
      destroy,
    });
    const logError = vi.fn();

    await expect(
      executeCustomWidgetRequest({
        ...query,
        baseUrl: "http://127.0.0.1",
        method: "POST",
        networkScope: "loopback",
        kind: "action",
        logError,
      }),
    ).resolves.toMatchObject({ ok: true, status: 200, data: { updated: true } });
    expect(close).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorName: "DispatcherCloseError",
      }),
    );
  });

  it("redacts apiKeyQuery credentials from transport errors and structured log events", async () => {
    const apiKey = "api-key-query-secret";
    const request = vi.fn(async ({ path }: { path: string }) => {
      const failure = new Error(`Transport failed for https://example.com${path}`);
      failure.name = `SocketError:${path}`;
      throw failure;
    });
    mocks.createPinnedAgent.mockReturnValue({
      request,
      close: vi.fn(async () => undefined),
      destroy: vi.fn(async () => undefined),
    });
    const logError = vi.fn();

    const error = await executeCustomWidgetRequest({
      ...query,
      baseUrl: "http://127.0.0.1",
      targetUrl: "http://127.0.0.1/status?view=summary",
      networkScope: "loopback",
      auth: {
        type: "apiKeyQuery",
        headerName: "access_token",
        secrets: [{ kind: "apiKey", value: apiKey }],
      },
      logError,
    }).then(
      () => undefined,
      (cause: unknown) => cause,
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining(`access_token=${apiKey}`),
      }),
    );
    expect(error).toMatchObject({
      code: "BAD_GATEWAY",
      message: "External request failed",
    });
    expect((error as Error).cause).toBeUndefined();
    expect(String(error)).not.toContain(apiKey);
    expect(String(error)).not.toContain("access_token");
    expect(logError).toHaveBeenCalledWith({
      origin: "http://127.0.0.1",
      method: "GET",
      errorName: "TransportError",
    });
    expect(JSON.stringify({ error, logCalls: logError.mock.calls })).not.toContain(apiKey);
    expect(JSON.stringify({ error, logCalls: logError.mock.calls })).not.toContain("access_token");
  });
});
