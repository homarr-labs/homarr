import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ReleaseErrorCode, ReleaseResponse } from "../release-providers";
import { releasesRequestHandler, TransientReleaseError } from "../releases";

const mocks = vi.hoisted(() => ({
  getLatestMatchingReleaseAsync: vi.fn(),
}));

vi.mock("../release-providers", () => ({
  getLatestMatchingReleaseAsync: mocks.getLatestMatchingReleaseAsync,
}));

const hourMs = 60 * 60 * 1000;

const found = (version: string): ReleaseResponse => ({
  success: true,
  data: { latestRelease: version, latestReleaseAt: new Date("2026-10-20T00:00:00Z") },
});

const failed = (code: ReleaseErrorCode): ReleaseResponse => ({ success: false, error: { code, message: code } });

const lookupAsync = async (id = "radarr") => {
  const { data } = await releasesRequestHandler
    .handler({ id, provider: "github", identifier: "owner/repo" })
    .getDataAsync();
  return data;
};

describe("releasesRequestHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T00:00:00Z"));
    releasesRequestHandler.invalidateCache();
    mocks.getLatestMatchingReleaseAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("checks a repository at most once every 6 hours", async () => {
    mocks.getLatestMatchingReleaseAsync.mockResolvedValueOnce(found("v1.0.0")).mockResolvedValueOnce(found("v1.1.0"));

    await lookupAsync();
    await vi.advanceTimersByTimeAsync(6 * hourMs - 1);
    const cached = await lookupAsync();
    await vi.advanceTimersByTimeAsync(2);
    const refreshed = await lookupAsync();

    expect(cached).toEqual(found("v1.0.0"));
    expect(refreshed).toEqual(found("v1.1.0"));
    expect(mocks.getLatestMatchingReleaseAsync).toHaveBeenCalledTimes(2);
  });

  test("shares one lookup between widgets tracking the same repository", async () => {
    mocks.getLatestMatchingReleaseAsync.mockResolvedValue(found("v1.0.0"));

    await lookupAsync("first-widget");
    await lookupAsync("second-widget");

    expect(mocks.getLatestMatchingReleaseAsync).toHaveBeenCalledTimes(1);
  });

  test.each<ReleaseErrorCode>(["rateLimited", "unexpected"])(
    "keeps showing the last release when a refresh fails with %s",
    async (code) => {
      mocks.getLatestMatchingReleaseAsync.mockResolvedValueOnce(found("v1.0.0")).mockResolvedValueOnce(failed(code));

      await lookupAsync();
      await vi.advanceTimersByTimeAsync(6 * hourMs + 1);

      expect(await lookupAsync()).toEqual(found("v1.0.0"));
    },
  );

  test("stops showing the last release 24 hours after it was fetched", async () => {
    mocks.getLatestMatchingReleaseAsync.mockResolvedValueOnce(found("v1.0.0")).mockResolvedValue(failed("rateLimited"));

    await lookupAsync();
    await vi.advanceTimersByTimeAsync(24 * hourMs + 1);

    await expect(lookupAsync()).rejects.toThrow(TransientReleaseError);
  });

  test("reports the error code of a failed first lookup", async () => {
    mocks.getLatestMatchingReleaseAsync.mockResolvedValue(failed("rateLimited"));

    const lookup = lookupAsync();

    await expect(lookup).rejects.toThrow(TransientReleaseError);
    await expect(lookup).rejects.toMatchObject({ releaseError: { code: "rateLimited" } });
  });

  test("retries a failed first lookup on the next request", async () => {
    mocks.getLatestMatchingReleaseAsync
      .mockResolvedValueOnce(failed("unexpected"))
      .mockResolvedValueOnce(found("v1.0.0"));

    await lookupAsync().catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1);

    expect(await lookupAsync()).toEqual(found("v1.0.0"));
  });

  test("caches errors that need a configuration change for 1 hour", async () => {
    mocks.getLatestMatchingReleaseAsync
      .mockResolvedValueOnce(failed("notFound"))
      .mockResolvedValueOnce(found("v1.0.0"));

    const cached = await lookupAsync();
    await vi.advanceTimersByTimeAsync(hourMs - 1);
    await lookupAsync();
    await vi.advanceTimersByTimeAsync(2);
    const refreshed = await lookupAsync();

    expect(cached).toEqual(failed("notFound"));
    expect(refreshed).toEqual(found("v1.0.0"));
    expect(mocks.getLatestMatchingReleaseAsync).toHaveBeenCalledTimes(2);
  });
});
