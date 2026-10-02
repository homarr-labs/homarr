import { beforeEach, describe, expect, test, vi } from "vitest";

import { mediaTranscodingRequestHandler } from "./media-transcoding";

const mocks = vi.hoisted(() => ({
  createIntegrationAsync: vi.fn(),
}));

vi.mock("@homarr/integrations/factory", () => ({
  createIntegrationAsync: mocks.createIntegrationAsync,
}));

const integration = {
  id: "tdarr-integration",
  kind: "tdarr",
} as Parameters<typeof mediaTranscodingRequestHandler.handler>[0];

describe("mediaTranscodingRequestHandler", () => {
  beforeEach(() => {
    mediaTranscodingRequestHandler.invalidateCache();
    mocks.createIntegrationAsync.mockReset();
  });

  test("starts independent upstream requests together", async () => {
    const requestsStarted = Promise.withResolvers<void>();
    const getQueueAsync = vi.fn(async () => {
      await requestsStarted.promise;
      return { array: [], totalCount: 0, startIndex: 0, endIndex: 0 };
    });
    const getWorkersAsync = vi.fn(async () => {
      await requestsStarted.promise;
      return [];
    });
    const getStatisticsAsync = vi.fn(async () => {
      await requestsStarted.promise;
      return {};
    });
    mocks.createIntegrationAsync.mockResolvedValue({ getQueueAsync, getWorkersAsync, getStatisticsAsync });

    const resultPromise = mediaTranscodingRequestHandler
      .handler(integration, { pageOffset: 0, pageSize: 10 })
      .getDataAsync();

    await vi.waitFor(() => {
      expect(getQueueAsync).toHaveBeenCalledOnce();
      expect(getWorkersAsync).toHaveBeenCalledOnce();
      expect(getStatisticsAsync).toHaveBeenCalledOnce();
    });
    requestsStarted.resolve();
    await resultPromise;
  });
});
