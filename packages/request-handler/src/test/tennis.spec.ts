// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockCommonEnv = vi.hoisted(() => ({ NO_EXTERNAL_CONNECTION: false }));
const mockEnv = vi.hoisted(() => ({ LIVE_TENNIS_API_KEY: undefined as string | undefined }));
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock("@homarr/common/env", () => ({ env: mockCommonEnv }));
vi.mock("../env", () => ({ env: mockEnv }));
vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: mockFetch }));

import { fetchTennisMatchesHandler, TennisApiKeyError } from "../tennis";

const input = { tour: "all", status: "live", matchCount: 5 };

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

describe("fetchTennisMatchesHandler", () => {
  beforeEach(() => {
    mockCommonEnv.NO_EXTERNAL_CONNECTION = false;
    mockEnv.LIVE_TENNIS_API_KEY = "twjp_test_key";
    mockFetch.mockReset();
  });

  test("throws a TennisApiKeyError when no API key is configured", async () => {
    mockEnv.LIVE_TENNIS_API_KEY = undefined;

    await expect(fetchTennisMatchesHandler.handler(input).getDataAsync()).rejects.toBeInstanceOf(TennisApiKeyError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("returns no matches and performs no request when NO_EXTERNAL_CONNECTION is set", async () => {
    mockCommonEnv.NO_EXTERNAL_CONNECTION = true;

    const result = await fetchTennisMatchesHandler.handler({ ...input, matchCount: 1 }).getDataAsync();

    expect(result.data.matches).toStrictEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("throws a TennisApiKeyError when the API rejects the key", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "unauthorized" }, 401));

    await expect(fetchTennisMatchesHandler.handler({ ...input, matchCount: 2 }).getDataAsync()).rejects.toBeInstanceOf(
      TennisApiKeyError,
    );
  });

  test("throws a generic error on a server side failure", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 503));

    const promise = fetchTennisMatchesHandler.handler({ ...input, matchCount: 3 }).getDataAsync();

    await expect(promise).rejects.toThrow("Live Tennis API responded with 503");
    await expect(promise).rejects.not.toBeInstanceOf(TennisApiKeyError);
  });

  test("propagates network failures so the widget can show its error state", async () => {
    mockFetch.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.livetennisapi.com"));

    await expect(fetchTennisMatchesHandler.handler({ ...input, matchCount: 4 }).getDataAsync()).rejects.toThrow(
      "ENOTFOUND",
    );
  });

  test("omits the tour parameter when all tours are selected", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));

    await fetchTennisMatchesHandler.handler({ ...input, matchCount: 6 }).getDataAsync();

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("status=live");
    expect(url).toContain("limit=6");
    expect(url).not.toContain("tour=");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer twjp_test_key");
  });

  test("sends the tour parameter when a single tour is selected", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));

    await fetchTennisMatchesHandler.handler({ ...input, tour: "wta", matchCount: 7 }).getDataAsync();

    expect(mockFetch.mock.calls[0]?.[0]).toContain("tour=wta");
  });
});
