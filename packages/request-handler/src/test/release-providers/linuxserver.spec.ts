import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, resetProviderState, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const tautulli = {
  name: "tautulli",
  initial_date: "2015-08-10",
  github_url: "https://github.com/linuxserver/docker-tautulli",
  description: "Tautulli image",
  version: "v2.17.2-ls237",
  version_timestamp: "2026-07-17 00:25:42+00:00",
  stars: 934,
  deprecated: false,
  changelog: [{ date: "2026-07-05", desc: "Rebase to Alpine 3.24." }],
};

const imagesReply = (...images: unknown[]): ProviderReply => ({
  body: { data: { repositories: { linuxserver: [{ name: "broken" }, ...images] } } },
});

const githubRepository = {
  html_url: "https://github.com/linuxserver/docker-tautulli",
  description: "GitHub description",
  fork: false,
  archived: false,
  created_at: "2015-08-10T00:00:00.000Z",
  stargazers_count: 934,
  open_issues_count: 2,
  forks_count: 80,
};

const serveLinuxServer = (images: ProviderReply, githubReleases: ProviderReply = { status: 404, body: {} }) =>
  serveProvider((request) => {
    if (request.url.origin === "https://api.linuxserver.io" && request.url.pathname === "/api/v1/images") return images;
    if (request.url.pathname === "/repos/linuxserver/docker-tautulli/releases") return githubReleases;
    if (request.url.pathname === "/repos/linuxserver/docker-tautulli") return { body: githubRepository };
    return undefined;
  });

describe("LinuxServer.io releases", () => {
  beforeEach(() => {
    resetProviderState();
  });

  test("uses the registry's latest version without fetching GitHub", async () => {
    const requests = serveLinuxServer(imagesReply(tautulli));

    const release = await expectRelease({
      provider: "linuxServerIO",
      identifier: "lscr.io/linuxserver/tautulli:latest",
    });

    expect(release).toEqual({
      latestRelease: "v2.17.2-ls237",
      latestReleaseAt: new Date("2026-07-17T00:25:42.000Z"),
      releaseDescription: "Rebase to Alpine 3.24.",
      projectUrl: "https://github.com/linuxserver/docker-tautulli",
      projectDescription: "Tautulli image",
      isArchived: false,
      createdAt: new Date("2015-08-10T00:00:00.000Z"),
      starsCount: 934,
    });
    expect(requests).toHaveLength(1);
  });

  test("uses the latest version when it matches the version filter", async () => {
    const requests = serveLinuxServer(imagesReply(tautulli));

    const release = await expectRelease({
      provider: "linuxServerIO",
      identifier: "linuxserver/tautulli",
      versionRegex: "^v2\\.17\\..+-ls[0-9]+$",
    });

    expect(release.latestRelease).toBe("v2.17.2-ls237");
    expect(requests).toHaveLength(1);
  });

  test("reads the GitHub history when the version filter excludes the latest version", async () => {
    serveLinuxServer(imagesReply(tautulli), {
      body: [
        {
          tag_name: "v2.16.0-ls200",
          published_at: "2026-01-10T12:00:00.000Z",
          html_url: "https://github.com/linuxserver/docker-tautulli/releases/tag/v2.16.0-ls200",
          body: "Older supported image",
          prerelease: false,
        },
      ],
    });

    const release = await expectRelease({
      provider: "linuxServerIO",
      identifier: "linuxserver/tautulli",
      versionRegex: "^v2\\.16\\..+-ls[0-9]+$",
    });

    expect(release).toMatchObject({
      latestRelease: "v2.16.0-ls200",
      releaseDescription: "Older supported image",
      projectUrl: "https://github.com/linuxserver/docker-tautulli",
      projectDescription: "Tautulli image",
      createdAt: new Date("2015-08-10T00:00:00.000Z"),
    });
  });

  test("returns the GitHub error when the history cannot be read", async () => {
    serveLinuxServer(imagesReply(tautulli), { status: 404, body: { message: "GitHub unavailable" } });

    const error = await expectFailure({
      provider: "linuxServerIO",
      identifier: "linuxserver/tautulli",
      versionRegex: "^v2\\.16\\.",
    });

    expect(error).toMatchObject({ code: "notFound", message: expect.stringContaining("GitHub unavailable") });
  });

  test("reports noMatchingVersion when the filter excludes the latest version and there is no GitHub repository", async () => {
    serveLinuxServer(imagesReply({ ...tautulli, github_url: null }));

    const error = await expectFailure({
      provider: "linuxServerIO",
      identifier: "linuxserver/tautulli",
      versionRegex: "^v1\\.",
    });

    expect(error.code).toBe("noMatchingVersion");
  });

  test("reports notFound for an image that is not in the registry", async () => {
    serveLinuxServer(imagesReply(tautulli));

    const error = await expectFailure({ provider: "linuxServerIO", identifier: "linuxserver/radarr" });

    expect(error.code).toBe("notFound");
  });

  test("tolerates optional registry fields", async () => {
    serveLinuxServer(
      imagesReply({ name: "tautulli", version: "v1.0.0-ls1", version_timestamp: "2026-01-01 00:00:00+00:00" }),
    );

    const release = await expectRelease({ provider: "linuxServerIO", identifier: "linuxserver/tautulli" });

    expect(release).toMatchObject({
      latestRelease: "v1.0.0-ls1",
      projectUrl: undefined,
      releaseDescription: undefined,
    });
  });
});
