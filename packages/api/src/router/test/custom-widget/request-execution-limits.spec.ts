import { createId } from "@homarr/common";
import type * as CustomWidgetServer from "@homarr/custom-widgets/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeDomainRequest: vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: { value: 42 },
  })),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("@homarr/custom-widgets/server", async (importOriginal) => {
  const actual = await importOriginal<typeof CustomWidgetServer>();
  return {
    ...actual,
    executeCustomWidgetRequest: mocks.executeDomainRequest,
  };
});

import { executeCustomWidgetRequest } from "../../custom-widget/request-executor";

describe("custom widget request execution limits", () => {
  beforeEach(() => {
    mocks.executeDomainRequest.mockClear();
    mocks.logger.error.mockClear();
  });

  test("acquires capacity only for a query cache miss", async () => {
    const release = vi.fn(async () => undefined);
    const acquireRequestLimit = vi.fn(async () => release);
    const input = {
      baseUrl: "https://example.com",
      targetUrl: "https://example.com/status",
      method: "GET" as const,
      networkScope: "public" as const,
      kind: "query" as const,
      cacheKey: `custom-jsx:${createId()}:version:status:params`,
      cacheTtlSeconds: 60,
    };

    await executeCustomWidgetRequest(input, { acquireRequestLimit });
    await executeCustomWidgetRequest(input, { acquireRequestLimit });

    expect(mocks.executeDomainRequest).toHaveBeenCalledOnce();
    expect(acquireRequestLimit).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  test("keeps every action inside request accounting", async () => {
    const release = vi.fn(async () => undefined);
    const acquireRequestLimit = vi.fn(async () => release);
    const input = {
      baseUrl: "https://example.com",
      targetUrl: "https://example.com/action",
      method: "POST" as const,
      networkScope: "public" as const,
      kind: "action" as const,
    };

    await executeCustomWidgetRequest(input, { acquireRequestLimit });
    await executeCustomWidgetRequest(input, { acquireRequestLimit });

    expect(mocks.executeDomainRequest).toHaveBeenCalledTimes(2);
    expect(acquireRequestLimit).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(2);
  });

  test("replaces an unexpected apiKeyQuery transport error with safe public and loggable metadata", async () => {
    const apiKey = "api-key-query-secret";
    const tokenizedUrl = `https://example.com/status?access_token=${apiKey}`;
    const transportFailure = new Error(`Transport failed for ${tokenizedUrl}`);
    transportFailure.name = `SocketError:${tokenizedUrl}`;
    mocks.executeDomainRequest.mockRejectedValueOnce(transportFailure);

    const error = await executeCustomWidgetRequest({
      baseUrl: "https://example.com",
      targetUrl: "https://example.com/status",
      method: "GET",
      networkScope: "public",
      kind: "query",
      auth: {
        type: "apiKeyQuery",
        headerName: "access_token",
        secrets: [{ kind: "apiKey", value: apiKey }],
      },
    }).then(
      () => undefined,
      (cause: unknown) => cause,
    );

    expect(error).toMatchObject({
      code: "BAD_GATEWAY",
      message: "External request failed",
    });
    expect((error as Error).cause).toBeUndefined();
    expect(mocks.logger.error).toHaveBeenCalledWith("Custom widget request failed", {
      event: "custom_widget_request_failed",
      errorName: "UnexpectedTransportError",
      origin: "https://example.com",
      method: "GET",
    });
    expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain(apiKey);
    expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain("access_token");
    expect(String(error)).not.toContain(apiKey);
  });
});
