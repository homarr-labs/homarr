import { beforeEach, describe, expect, test, vi } from "vitest";

import type { MediaRequestStats } from "@homarr/integrations/types";

import { mediaRequestStatsRequestHandler } from "./media-request-stats";

const mocks = vi.hoisted(() => ({
  createIntegrationAsync: vi.fn(),
}));

vi.mock("@homarr/integrations/factory", () => ({
  createIntegrationAsync: mocks.createIntegrationAsync,
}));

const integration = {
  id: "media-request-integration",
  kind: "overseerr",
} as Parameters<typeof mediaRequestStatsRequestHandler.handler>[0];

describe("mediaRequestStatsRequestHandler", () => {
  beforeEach(() => {
    mediaRequestStatsRequestHandler.invalidateCache();
    mocks.createIntegrationAsync.mockReset();
  });

  test("starts independent upstream requests together", async () => {
    const requestsStarted = Promise.withResolvers<void>();
    const expected = {
      stats: {
        total: 8,
        movie: 5,
        tv: 3,
        pending: 1,
        approved: 2,
        declined: 1,
        processing: 1,
        available: 3,
      },
      users: [{ id: 1, displayName: "User", avatar: "/avatar.png", requestCount: 4, link: "/users/1" }],
    } satisfies MediaRequestStats;
    const getStatsAsync = vi.fn(async () => {
      await requestsStarted.promise;
      return expected.stats;
    });
    const getUsersAsync = vi.fn(async () => {
      await requestsStarted.promise;
      return expected.users;
    });
    mocks.createIntegrationAsync.mockResolvedValue({ getStatsAsync, getUsersAsync });

    const resultPromise = mediaRequestStatsRequestHandler.handler(integration, {}).getDataAsync();

    await vi.waitFor(() => {
      expect(getStatsAsync).toHaveBeenCalledOnce();
      expect(getUsersAsync).toHaveBeenCalledOnce();
    });
    requestsStarted.resolve();
    await expect(resultPromise).resolves.toMatchObject({ data: expected });
  });
});
