import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, resetProviderState, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const day = (value: number) => new Date(Date.UTC(2026, 9, value)).toISOString();

const codebergRelease = (
  tag: string,
  published: number,
  details: { prerelease?: boolean; html_url?: string } = {},
) => ({
  tag_name: tag,
  published_at: day(published),
  url: `https://codeberg.org/api/v1/repos/forgejo/forgejo/releases/${tag}`,
  html_url: `https://codeberg.org/forgejo/forgejo/releases/tag/${tag}`,
  body: `Notes for ${tag}`,
  prerelease: false,
  ...details,
});

const repository = {
  html_url: "https://codeberg.org/forgejo/forgejo",
  description: "Forgejo",
  fork: false,
  archived: false,
  created_at: "2022-11-01T00:00:00Z",
  stars_count: 1000,
  open_issues_count: 50,
  forks_count: 300,
};

const serveCodeberg = (
  releases: ProviderReply,
  repositoryReply: ProviderReply = { body: repository },
  origin = "https://codeberg.org",
) =>
  serveProvider((request) => {
    const path = `${request.url.origin}${request.url.pathname}`;
    if (path === `${origin}/api/v1/repos/forgejo/forgejo/releases`) return releases;
    if (path === `${origin}/api/v1/repos/forgejo/forgejo`) return repositoryReply;
    return undefined;
  });

describe("Codeberg releases", () => {
  beforeEach(() => {
    resetProviderState();
  });

  test("returns the newest release with its web URL and repository details", async () => {
    serveCodeberg({ body: [codebergRelease("v16.0.0", 1), codebergRelease("v17.0.0", 15)] });

    const release = await expectRelease({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(release).toEqual({
      latestRelease: "v17.0.0",
      latestReleaseAt: new Date(day(15)),
      releaseUrl: "https://codeberg.org/forgejo/forgejo/releases/tag/v17.0.0",
      releaseDescription: "Notes for v17.0.0",
      isPreRelease: false,
      projectUrl: "https://codeberg.org/forgejo/forgejo",
      projectDescription: "Forgejo",
      isFork: false,
      isArchived: false,
      createdAt: new Date("2022-11-01T00:00:00Z"),
      starsCount: 1000,
      openIssues: 50,
      forksCount: 300,
    });
  });

  test("falls back to the API URL when the release has no web URL", async () => {
    serveCodeberg({ body: [{ ...codebergRelease("v1.0.0", 1), html_url: undefined }] });

    const release = await expectRelease({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(release.releaseUrl).toBe("https://codeberg.org/api/v1/repos/forgejo/forgejo/releases/v1.0.0");
  });

  test("keeps the pre-release flag", async () => {
    serveCodeberg({ body: [codebergRelease("v18.0.0-rc0", 20, { prerelease: true })] });

    const release = await expectRelease({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(release.isPreRelease).toBe(true);
  });

  test("filters by version pattern", async () => {
    serveCodeberg({ body: [codebergRelease("v17.0.0", 15), codebergRelease("v11.0.6", 10)] });

    const release = await expectRelease({
      provider: "codeberg",
      identifier: "forgejo/forgejo",
      versionRegex: "^v11\\.",
    });

    expect(release.latestRelease).toBe("v11.0.6");
  });

  test("uses a self-hosted Forgejo or Gitea instance with a token", async () => {
    const requests = serveCodeberg(
      { body: [codebergRelease("v1.0.0", 1)] },
      { body: repository },
      "https://git.example.com",
    );

    await expectRelease({
      provider: "codeberg",
      identifier: "forgejo/forgejo",
      providerUrl: "https://git.example.com",
      token: "secret",
    });

    expect(requests.map((request) => request.headers.authorization)).toEqual(["token secret", "token secret"]);
  });

  test("still returns the release when repository details fail", async () => {
    serveCodeberg({ body: [codebergRelease("v1.0.0", 1)] }, { status: 500 });

    const release = await expectRelease({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(release.projectUrl).toBeUndefined();
  });

  test("reports noReleasesFound without releases", async () => {
    serveCodeberg({ body: [] });

    const error = await expectFailure({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("reports noReleasesFound when the repository has releases turned off", async () => {
    serveCodeberg({ status: 404 });

    const error = await expectFailure({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("reports notFound for an unknown repository", async () => {
    serveCodeberg({ status: 404 }, { status: 404 });

    const error = await expectFailure({ provider: "codeberg", identifier: "forgejo/forgejo" });

    expect(error.code).toBe("notFound");
  });

  test("rejects an identifier without a repository name", async () => {
    const error = await expectFailure({ provider: "codeberg", identifier: "forgejo" });

    expect(error.code).toBe("invalidIdentifier");
  });
});
