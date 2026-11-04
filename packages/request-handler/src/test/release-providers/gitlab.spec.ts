import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, resetProviderState, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const now = new Date("2026-10-01T00:00:00Z");
const daysFromNow = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

const gitlabRelease = (tag: string, releasedInDays: number) => ({
  tag_name: tag,
  released_at: daysFromNow(releasedInDays),
  description: `Notes for ${tag}`,
  _links: { self: `https://gitlab.com/group/project/-/releases/${tag}` },
});

const project = {
  web_url: "https://gitlab.com/gitlab-org/gitlab-runner",
  description: "Runner",
  forked_from_project: null,
  archived: false,
  created_at: "2015-01-01T00:00:00Z",
  star_count: 100,
  open_issues_count: 4,
  forks_count: 9,
};

const serveGitlab = (
  encodedProject: string,
  releases: ProviderReply,
  projectReply: ProviderReply = { body: project },
  origin = "https://gitlab.com",
) =>
  serveProvider((request) => {
    const path = `${request.url.origin}${request.url.pathname}`;
    if (path === `${origin}/api/v4/projects/${encodedProject}/releases`) return releases;
    if (path === `${origin}/api/v4/projects/${encodedProject}`) return projectReply;
    return undefined;
  });

describe("GitLab releases", () => {
  beforeEach(() => {
    resetProviderState();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns the newest release with project details", async () => {
    serveGitlab("gitlab-org%2Fgitlab-runner", {
      body: [gitlabRelease("v19.4.0", -40), gitlabRelease("v19.5.0", -8), gitlabRelease("v19.3.2", -2)],
    });

    const release = await expectRelease({ provider: "gitlab", identifier: "gitlab-org/gitlab-runner" });

    expect(release).toEqual({
      latestRelease: "v19.3.2",
      latestReleaseAt: new Date(daysFromNow(-2)),
      releaseUrl: "https://gitlab.com/group/project/-/releases/v19.3.2",
      releaseDescription: "Notes for v19.3.2",
      isPreRelease: false,
      projectUrl: "https://gitlab.com/gitlab-org/gitlab-runner",
      projectDescription: "Runner",
      isFork: false,
      isArchived: false,
      createdAt: new Date("2015-01-01T00:00:00Z"),
      starsCount: 100,
      openIssues: 4,
      forksCount: 9,
    });
  });

  test("flags an upcoming release as a pre-release", async () => {
    serveGitlab("group%2Fproject", { body: [gitlabRelease("v2.0.0", 3), gitlabRelease("v1.0.0", -3)] });

    const release = await expectRelease({ provider: "gitlab", identifier: "group/project" });

    expect(release).toMatchObject({ latestRelease: "v2.0.0", isPreRelease: true });
  });

  test("encodes nested group paths", async () => {
    const requests = serveGitlab("group%2Fsubgroup%2Fproject", { body: [gitlabRelease("v1.0.0", -1)] });

    await expectRelease({ provider: "gitlab", identifier: "group/subgroup/project" });

    expect(requests[0]?.url.pathname).toBe("/api/v4/projects/group%2Fsubgroup%2Fproject/releases");
  });

  test("accepts a numeric project id", async () => {
    serveGitlab("278964", { body: [gitlabRelease("v1.0.0", -1)] });

    const release = await expectRelease({ provider: "gitlab", identifier: "278964" });

    expect(release.latestRelease).toBe("v1.0.0");
  });

  test("marks forks", async () => {
    serveGitlab(
      "group%2Fproject",
      { body: [gitlabRelease("v1.0.0", -1)] },
      { body: { ...project, forked_from_project: { id: 1 } } },
    );

    const release = await expectRelease({ provider: "gitlab", identifier: "group/project" });

    expect(release.isFork).toBe(true);
  });

  test("uses a self-hosted instance and sends the private token", async () => {
    const requests = serveGitlab(
      "group%2Fproject",
      { body: [gitlabRelease("v1.0.0", -1)] },
      { body: project },
      "https://git.example.com",
    );

    await expectRelease({
      provider: "gitlab",
      identifier: "group/project",
      providerUrl: "https://git.example.com",
      token: "glpat-secret",
    });

    expect(requests.map((request) => request.headers["private-token"])).toEqual(["glpat-secret", "glpat-secret"]);
  });

  test("filters by version pattern", async () => {
    serveGitlab("group%2Fproject", { body: [gitlabRelease("v2.0.0", -1), gitlabRelease("v1.4.0", -5)] });

    const release = await expectRelease({ provider: "gitlab", identifier: "group/project", versionRegex: "^v1\\." });

    expect(release.latestRelease).toBe("v1.4.0");
  });

  test("still returns the release when project details fail", async () => {
    serveGitlab("group%2Fproject", { body: [gitlabRelease("v1.0.0", -1)] }, { status: 403 });

    const release = await expectRelease({ provider: "gitlab", identifier: "group/project" });

    expect(release.latestRelease).toBe("v1.0.0");
    expect(release.projectUrl).toBeUndefined();
  });

  test("reports noReleasesFound without releases", async () => {
    serveGitlab("group%2Fproject", { body: [] });

    const error = await expectFailure({ provider: "gitlab", identifier: "group/project" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("reports notFound for an unknown project", async () => {
    serveGitlab("group%2Fproject", { status: 404 });

    const error = await expectFailure({ provider: "gitlab", identifier: "group/project" });

    expect(error.code).toBe("notFound");
  });
});
