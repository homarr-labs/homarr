import { beforeEach, describe, expect, test, vi } from "vitest";
import { Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { getLatestMatchingReleaseAsync } from "../release-providers";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const limitMessage = "Only the first 1000 results are available";

const mockHistoryFailure = (failurePage: number, status: number, message: string) => {
  const pages: number[] = [];
  mockedFetch.mockImplementation(async (input) => {
    let requestUrl = input.toString();
    if (typeof input === "object" && "url" in input) requestUrl = String(input.url);
    const url = new URL(requestUrl);
    if (!url.pathname.endsWith("/releases")) {
      return new Response(JSON.stringify({ created_at: "2020-01-01T00:00:00Z" }), {
        headers: { "content-type": "application/json" },
      });
    }
    const page = Number(url.searchParams.get("page") ?? 1);
    pages.push(page);
    if (page === failurePage) {
      return new Response(JSON.stringify({ message }), { status, headers: { "content-type": "application/json" } });
    }
    const releases = Array.from({ length: 100 }, (_, index) => {
      const offset = (page - 1) * 100 + index;
      return {
        tag_name: `v${1001 - offset}`,
        published_at: new Date(Date.UTC(2026, 0, 1) - offset * 1000).toISOString(),
        html_url: "https://example.com/release",
        body: "",
        prerelease: false,
      };
    });
    url.searchParams.set("page", String(page + 1));
    return new Response(JSON.stringify(releases), {
      headers: { "content-type": "application/json", link: `<${url}>; rel="next"` },
    });
  });
  return pages;
};

const request = (versionRegex?: string) =>
  getLatestMatchingReleaseAsync({ id: "fixture", provider: "github", identifier: "owner/repo", versionRegex });

describe("GitHub release history limits", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test.each([
    { versionRegex: undefined, expected: "v1001" },
    { versionRegex: "^v2$", expected: "v2" },
  ])(
    "retains matching release $expected when the next page reaches GitHub's cap",
    async ({ versionRegex, expected }) => {
      const pages = mockHistoryFailure(11, 422, limitMessage);
      const result = await request(versionRegex);

      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error.message);
      expect(result.data.latestRelease).toBe(expected);
      expect(pages).toEqual(Array.from({ length: 11 }, (_, index) => index + 1));
    },
  );

  test.each([
    { page: 2, status: 422, message: "Validation Failed" },
    { page: 2, status: 401, message: "Bad credentials" },
    { page: 1, status: 422, message: limitMessage },
  ])("does not hide an API error on page $page: $message", async ({ page, status, message }) => {
    mockHistoryFailure(page, status, message);
    const result = await request();

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected API failure");
    expect(result.error.code).toBe("unexpected");
    expect(result.error.message).toContain(message);
  });
});
