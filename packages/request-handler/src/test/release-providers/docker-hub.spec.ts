import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, resetProviderState, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

interface HubTag {
  name: string;
  last_updated?: string | null;
  digest?: string | null;
}

interface FakeHub {
  namespace: string;
  name: string;
  pages: HubTag[][];
  details?: ProviderReply;
  tagsReply?: ProviderReply;
}

const day = (value: number) => new Date(Date.UTC(2026, 8, value)).toISOString();
const tag = (name: string, updated: number, digest?: string): HubTag => ({ name, last_updated: day(updated), digest });

const serveHub = (hub: FakeHub) =>
  serveProvider((request) => {
    const repositoryPath = `/v2/namespaces/${hub.namespace}/repositories/${hub.name}`;
    if (request.url.origin !== "https://hub.docker.com") return undefined;
    if (request.url.pathname === `${repositoryPath}/`) {
      return (
        hub.details ?? { body: { name: hub.name, namespace: hub.namespace, description: "Image", star_count: 12 } }
      );
    }
    if (request.url.pathname !== `${repositoryPath}/tags`) return undefined;
    if (hub.tagsReply) return hub.tagsReply;

    const page = Number(request.url.searchParams.get("page"));
    const next = `https://hub.docker.com${repositoryPath}/tags?page=${page + 1}`;
    if (page < hub.pages.length) return { body: { next, results: hub.pages[page - 1] } };
    return { body: { next: null, results: hub.pages[page - 1] ?? [] } };
  });

const requestedPages = (requests: ReturnType<typeof serveHub>) =>
  requests
    .filter((request) => request.url.pathname.endsWith("/tags"))
    .map((request) => Number(request.url.searchParams.get("page")));

describe("Docker Hub releases", () => {
  beforeEach(() => {
    resetProviderState();
  });

  describe("floating tags", () => {
    test("resolves latest to the version tag with the same digest (Seerr)", async () => {
      serveHub({
        namespace: "seerr",
        name: "seerr",
        pages: [
          [
            tag("latest", 20, "sha256:b"),
            tag("develop", 21, "sha256:c"),
            tag("v3.5.1", 19, "sha256:b"),
            tag("v3.5.0", 2, "sha256:a"),
          ],
        ],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "seerr/seerr" });

      expect(release).toMatchObject({
        latestRelease: "v3.5.1",
        resolvedFromTag: "latest",
        latestReleaseAt: new Date(day(20)),
        projectUrl: "https://hub.docker.com/r/seerr/seerr",
      });
    });

    test("picks the most specific plain version among digest siblings (official postgres)", async () => {
      serveHub({
        namespace: "library",
        name: "postgres",
        pages: [
          [
            tag("latest", 10, "sha256:pg"),
            tag("bookworm", 10, "sha256:pg"),
            tag("17", 10, "sha256:pg"),
            tag("17.2-bookworm", 10, "sha256:pg"),
            tag("17.2", 10, "sha256:pg"),
            tag("16.6", 9, "sha256:old"),
          ],
        ],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "postgres" });

      expect(release).toMatchObject({
        latestRelease: "17.2",
        resolvedFromTag: "latest",
        projectUrl: "https://hub.docker.com/_/postgres",
      });
    });

    test("resolves a tag with only version-like siblings", async () => {
      serveHub({
        namespace: "fnsys",
        name: "dockhand",
        pages: [[tag("latest", 5, "sha256:d"), tag("v1.0.54-alpine", 5, "sha256:d"), tag("nightly", 6, "sha256:n")]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "fnsys/dockhand" });

      expect(release).toMatchObject({ latestRelease: "v1.0.54-alpine", resolvedFromTag: "latest" });
    });

    test("keeps latest when no tag shares its digest", async () => {
      serveHub({
        namespace: "owner",
        name: "app",
        pages: [[tag("latest", 4, "sha256:x"), tag("develop", 5, "sha256:y")]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release).toMatchObject({ latestRelease: "latest", latestReleaseAt: new Date(day(4)) });
      expect(release.resolvedFromTag).toBeUndefined();
    });

    test("keeps latest when the registry returns no digests", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [[tag("latest", 4), tag("1.0.0", 4)]] });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release.latestRelease).toBe("latest");
    });

    test("uses stable when latest is not published", async () => {
      serveHub({
        namespace: "owner",
        name: "app",
        pages: [[tag("stable", 7, "sha256:s"), tag("2.4.1", 7, "sha256:s"), tag("edge", 8, "sha256:e")]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release).toMatchObject({ latestRelease: "2.4.1", resolvedFromTag: "stable" });
    });
  });

  describe("without a floating tag", () => {
    test("uses the highest plain version, comparing numerically", async () => {
      serveHub({
        namespace: "owner",
        name: "app",
        pages: [[tag("9.0.0", 20), tag("10.0.0", 1), tag("10.0.0-rc.1", 25)]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release).toMatchObject({ latestRelease: "10.0.0", latestReleaseAt: new Date(day(1)) });
    });

    test("uses the most recently updated tag when no tag is a plain version", async () => {
      serveHub({
        namespace: "owner",
        name: "app",
        pages: [[tag("main", 3), tag("nightly-20260912", 12), tag("dev", 8)]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release.latestRelease).toBe("nightly-20260912");
    });

    test("ignores tags without an update date", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [[{ name: "99.0.0", last_updated: null }, tag("1.0.0", 1)]] });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release.latestRelease).toBe("1.0.0");
    });

    test("reports noReleasesFound when no tag has an update date", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [[{ name: "1.0.0", last_updated: null }]] });

      const error = await expectFailure({ provider: "dockerHub", identifier: "owner/app" });

      expect(error.code).toBe("noReleasesFound");
    });

    test("reports noReleasesFound for a repository without tags", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [] });

      const error = await expectFailure({ provider: "dockerHub", identifier: "owner/app" });

      expect(error.code).toBe("noReleasesFound");
    });

    test("only reads the first tag page", async () => {
      const requests = serveHub({ namespace: "owner", name: "app", pages: [[tag("1.0.0", 1)], [tag("2.0.0", 2)]] });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release.latestRelease).toBe("1.0.0");
      expect(requestedPages(requests)).toEqual([1]);
    });
  });

  describe("version filters", () => {
    test("uses the highest matching major version (postgres precision 1)", async () => {
      serveHub({
        namespace: "library",
        name: "postgres",
        pages: [[tag("16", 20), tag("18", 1), tag("17", 30), tag("latest", 30)]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "postgres", versionRegex: "^\\d+$" });

      expect(release).toMatchObject({ latestRelease: "18", latestReleaseAt: new Date(day(1)) });
      expect(release.resolvedFromTag).toBeUndefined();
    });

    test("breaks version ties by the most recent update", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [[tag("v2.0", 1), tag("2.0", 9)]] });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app", versionRegex: "2\\.0$" });

      expect(release.latestRelease).toBe("2.0");
    });

    test("pages until a tag matches", async () => {
      const requests = serveHub({
        namespace: "owner",
        name: "app",
        pages: [[tag("dev", 1)], [tag("nightly", 2)], [tag("3.1.0-alpine", 3)], [tag("3.0.0-alpine", 4)]],
      });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app", versionRegex: "-alpine$" });

      expect(release.latestRelease).toBe("3.1.0-alpine");
      expect(requestedPages(requests)).toEqual([1, 2, 3]);
    });

    test("stops after five pages and reports noMatchingVersion", async () => {
      const pages = Array.from({ length: 8 }, (_, index) => [tag(`build-${index}`, index + 1)]);
      const requests = serveHub({ namespace: "owner", name: "app", pages });

      const error = await expectFailure({ provider: "dockerHub", identifier: "owner/app", versionRegex: "^1\\." });

      expect(error.code).toBe("noMatchingVersion");
      expect(requestedPages(requests)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("access", () => {
    test("normalizes full image references", async () => {
      const requests = serveHub({ namespace: "library", name: "postgres", pages: [[tag("17", 1)]] });

      await expectRelease({ provider: "dockerHub", identifier: "docker.io/library/postgres:17" });

      expect(requests[0]?.url.pathname).toBe("/v2/namespaces/library/repositories/postgres/tags");
    });

    test("sends a configured token as a bearer token", async () => {
      const requests = serveHub({ namespace: "owner", name: "private", pages: [[tag("1.0.0", 1)]] });

      await expectRelease({ provider: "dockerHub", identifier: "owner/private", token: "dckr_pat" });

      expect(requests.map((request) => request.headers.authorization)).toEqual(["Bearer dckr_pat", "Bearer dckr_pat"]);
    });

    test("still returns the release when repository details fail", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [[tag("1.0.0", 1)]], details: { status: 500 } });

      const release = await expectRelease({ provider: "dockerHub", identifier: "owner/app" });

      expect(release.latestRelease).toBe("1.0.0");
      expect(release.projectUrl).toBeUndefined();
    });

    test.each([
      { status: 404, code: "notFound" },
      { status: 429, code: "rateLimited" },
      { status: 503, code: "unexpected" },
    ])("maps a $status tag response to $code", async ({ status, code }) => {
      serveHub({ namespace: "owner", name: "app", pages: [], tagsReply: { status } });

      const error = await expectFailure({ provider: "dockerHub", identifier: "owner/app" });

      expect(error.code).toBe(code);
    });

    test("rejects a malformed tag response as unexpected", async () => {
      serveHub({ namespace: "owner", name: "app", pages: [], tagsReply: { body: { results: "nope" } } });

      const error = await expectFailure({ provider: "dockerHub", identifier: "owner/app" });

      expect(error.code).toBe("unexpected");
    });
  });
});
