import type { MediaRelease } from "@homarr/integrations/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { mediaReleaseRequestHandler } from "../media-release";

const mocks = vi.hoisted(() => ({
  createIntegrationAsync: vi.fn(),
}));

vi.mock("@homarr/integrations", () => ({
  createIntegrationAsync: mocks.createIntegrationAsync,
}));

const integration = {
  id: "plex-integration",
  kind: "plex",
} as Parameters<typeof mediaReleaseRequestHandler.handler>[0];

describe("mediaReleaseRequestHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T00:00:00Z"));
    mediaReleaseRequestHandler.invalidateCache();
    mocks.createIntegrationAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("keeps the last successful releases when a refresh fails", async () => {
    const releases = [{ id: "release-1" }] as MediaRelease[];
    const getMediaReleasesAsync = vi.fn().mockResolvedValueOnce(releases).mockRejectedValueOnce(new Error("Plex down"));
    mocks.createIntegrationAsync.mockResolvedValue({ getMediaReleasesAsync });

    const handler = mediaReleaseRequestHandler.handler(integration, {});
    const initial = await handler.getDataAsync();

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    const fallback = await handler.getDataAsync();

    expect(fallback).toEqual(initial);
    expect(getMediaReleasesAsync).toHaveBeenCalledTimes(2);
  });
});
