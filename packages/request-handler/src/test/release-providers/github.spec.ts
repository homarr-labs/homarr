import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply, ProviderRequest } from "./provider-server";
import { expectFailure, expectRelease, mockedFetch, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

interface GithubRelease {
  tag_name: string;
  published_at: string | null;
  html_url: string;
  body: string | null;
  prerelease: boolean;
}

interface FakeGithub {
  origin?: string;
  releases: GithubRelease[];
  repositoryReply?: ProviderReply;
  failPage?: { page: number; reply: ProviderReply };
  releasesReply?: ProviderReply;
}

const hour = (value: number) => new Date(Date.UTC(2026, 0, 1) - value * 3_600_000).toISOString();

const release = (tag: string, publishedHoursAgo: number, details: Partial<GithubRelease> = {}): GithubRelease => ({
  tag_name: tag,
  published_at: hour(publishedHoursAgo),
  html_url: `https://github.com/owner/repo/releases/tag/${tag}`,
  body: `Notes for ${tag}`,
  prerelease: false,
  ...details,
});

const repository = {
  html_url: "https://github.com/owner/repo",
  description: "A project",
  fork: false,
  archived: false,
  created_at: "2020-01-01T00:00:00Z",
  stargazers_count: 42,
  open_issues_count: 3,
  forks_count: 7,
};

const listReleases = (github: FakeGithub, request: ProviderRequest): ProviderReply => {
  const page = Number(request.url.searchParams.get("page") ?? 1);
  if (github.failPage?.page === page) return github.failPage.reply;
  const perPage = Number(request.url.searchParams.get("per_page"));
  const start = (page - 1) * perPage;
  if (start + perPage >= github.releases.length) return { body: github.releases.slice(start) };

  const next = new URL(request.url);
  next.searchParams.set("page", String(page + 1));
  return { body: github.releases.slice(start, start + perPage), headers: { link: `<${next.toString()}>; rel="next"` } };
};

const serveGithub = (github: FakeGithub) =>
  serveProvider((request) => {
    const origin = github.origin ?? "https://api.github.com";
    const path = `${request.url.origin}${request.url.pathname}`;
    if (path === `${origin}/repos/owner/repo`) return github.repositoryReply ?? { body: repository };
    if (path !== `${origin}/repos/owner/repo/releases`) return undefined;
    return github.releasesReply ?? listReleases(github, request);
  });

const releasePages = (requests: ProviderRequest[]) =>
  requests
    .filter((request) => request.url.pathname.endsWith("/releases"))
    .map((request) => Number(request.url.searchParams.get("page") ?? 1));

const numberedReleases = (count: number) =>
  Array.from({ length: count }, (_, index) => release(`v${count - index}`, index + 100));

const capMessage = "Only the first 1000 results are available";

describe("GitHub releases", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test("returns the newest published release with repository details from one page", async () => {
    const requests = serveGithub({
      releases: [
        release("v2.0.0", 30),
        release("v2.1.0", 2, { body: "Fixes" }),
        release("v1.9.9", 50),
        ...numberedReleases(20),
      ],
    });

    const result = await expectRelease({ provider: "github", identifier: "owner/repo" });

    expect(result).toEqual({
      latestRelease: "v2.1.0",
      latestReleaseAt: new Date(hour(2)),
      releaseUrl: "https://github.com/owner/repo/releases/tag/v2.1.0",
      releaseDescription: "Fixes",
      isPreRelease: false,
      projectUrl: "https://github.com/owner/repo",
      projectDescription: "A project",
      isFork: false,
      isArchived: false,
      createdAt: new Date("2020-01-01T00:00:00Z"),
      starsCount: 42,
      openIssues: 3,
      forksCount: 7,
    });
    expect(releasePages(requests)).toEqual([1]);
    expect(requests[0]?.url.searchParams.get("per_page")).toBe("10");
  });

  test("keeps the pre-release flag of the newest release", async () => {
    serveGithub({ releases: [release("v3.0.0-beta.1", 1, { prerelease: true }), release("v2.9.0", 5)] });

    const result = await expectRelease({ provider: "github", identifier: "owner/repo" });

    expect(result).toMatchObject({ latestRelease: "v3.0.0-beta.1", isPreRelease: true });
  });

  test("skips draft releases without a publication date", async () => {
    serveGithub({ releases: [release("v9.0.0", 0, { published_at: null }), release("v8.0.0", 3)] });

    const result = await expectRelease({ provider: "github", identifier: "owner/repo" });

    expect(result.latestRelease).toBe("v8.0.0");
  });

  test("reports noReleasesFound for a repository without releases", async () => {
    serveGithub({ releases: [] });

    const error = await expectFailure({ provider: "github", identifier: "owner/repo" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("still returns the release when repository details fail", async () => {
    serveGithub({ releases: [release("v1.0.0", 1)], repositoryReply: { status: 500, body: { message: "boom" } } });

    const result = await expectRelease({ provider: "github", identifier: "owner/repo" });

    expect(result.latestRelease).toBe("v1.0.0");
    expect(result.projectUrl).toBeUndefined();
  });

  test("uses a GitHub Enterprise API URL", async () => {
    const requests = serveGithub({ origin: "https://github.example.com", releases: [release("v1.0.0", 1)] });

    await expectRelease({ provider: "github", identifier: "owner/repo", providerUrl: "https://github.example.com/" });

    expect(requests.every((request) => request.url.origin === "https://github.example.com")).toBe(true);
  });

  test("sends a configured token", async () => {
    const requests = serveGithub({ releases: [release("v1.0.0", 1)] });

    await expectRelease({ provider: "github", identifier: "owner/repo", token: "ghp_secret" });

    expect(requests[0]?.headers.authorization).toBe("token ghp_secret");
  });

  test("rejects an identifier without a repository name before any request", async () => {
    const error = await expectFailure({ provider: "github", identifier: "owner" });

    expect(error.code).toBe("invalidIdentifier");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  describe("version filters", () => {
    test.each([
      { versionRegex: undefined, expected: "v1001", pageCount: 1 },
      { versionRegex: "^v2$", expected: "v2", pageCount: 10 },
    ])("stops paging at the first page containing $expected", async ({ versionRegex, expected, pageCount }) => {
      const requests = serveGithub({
        releases: numberedReleases(1001),
        failPage: { page: 11, reply: { status: 422, body: { message: capMessage } } },
      });

      const result = await expectRelease({ provider: "github", identifier: "owner/repo", versionRegex });

      expect(result.latestRelease).toBe(expected);
      expect(releasePages(requests)).toEqual(Array.from({ length: pageCount }, (_, index) => index + 1));
    });

    test("reads 100 releases per page while filtering", async () => {
      const requests = serveGithub({ releases: numberedReleases(5) });

      await expectRelease({ provider: "github", identifier: "owner/repo", versionRegex: "^v" });

      expect(requests[0]?.url.searchParams.get("per_page")).toBe("100");
    });

    test("returns the newest matching release instead of the highest version", async () => {
      serveGithub({ releases: [release("v2.0.0", 1), release("v1.10.1", 2), release("v1.11.0", 40)] });

      const result = await expectRelease({ provider: "github", identifier: "owner/repo", versionRegex: "^v1\\." });

      expect(result.latestRelease).toBe("v1.10.1");
    });

    test("reports noMatchingVersion when the history reaches GitHub's cap", async () => {
      const requests = serveGithub({
        releases: numberedReleases(1001),
        failPage: { page: 11, reply: { status: 422, body: { message: capMessage } } },
      });

      const error = await expectFailure({ provider: "github", identifier: "owner/repo", versionRegex: "^v0$" });

      expect(error.code).toBe("noMatchingVersion");
      expect(releasePages(requests)).toEqual(Array.from({ length: 11 }, (_, index) => index + 1));
    });

    test.each([
      { page: 2, status: 422, message: "Validation Failed" },
      { page: 2, status: 401, message: "Bad credentials" },
      { page: 1, status: 422, message: capMessage },
    ])("does not hide an API error on page $page: $message", async ({ page, status, message }) => {
      serveGithub({ releases: numberedReleases(300), failPage: { page, reply: { status, body: { message } } } });

      const error = await expectFailure({ provider: "github", identifier: "owner/repo", versionRegex: "^v2$" });

      expect(error.code).toBe("unexpected");
      expect(error.message).toContain(message);
    });
  });

  describe("errors", () => {
    test.each([
      { reply: { status: 404, body: { message: "Not Found" } }, code: "notFound" },
      { reply: { status: 429, body: { message: "Too Many Requests" } }, code: "rateLimited" },
      {
        reply: { status: 403, body: { message: "Forbidden" }, headers: { "x-ratelimit-remaining": "0" } },
        code: "rateLimited",
      },
      { reply: { status: 403, body: { message: "API rate limit exceeded for 1.2.3.4" } }, code: "rateLimited" },
      { reply: { status: 403, body: { message: "Resource not accessible" } }, code: "unexpected" },
      { reply: { status: 500, body: { message: "Server Error" } }, code: "unexpected" },
    ])("maps $reply.status $reply.body.message to $code", async ({ reply, code }) => {
      serveGithub({ releases: [], releasesReply: reply });

      const error = await expectFailure({ provider: "github", identifier: "owner/repo" });

      expect(error.code).toBe(code);
    });
  });
});
