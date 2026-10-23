import { beforeEach, describe, expect, test, vi } from "vitest";

import { image, serveOciRegistry } from "./oci-registry-server";
import { expectFailure, expectRelease, mockedFetch, resetProviderState } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const lookupGhcr = (
  identifier: string,
  extra: { versionRegex?: string; providerUrl?: string; token?: string } = {},
) => ({
  provider: "gitHubContainerRegistry" as const,
  identifier,
  ...extra,
});

const created = (day: number) => new Date(Date.UTC(2026, 9, day)).toISOString();

describe("GitHub Container Registry releases", () => {
  beforeEach(() => {
    resetProviderState();
  });

  describe("floating tags", () => {
    test("resolves latest through the OCI version label when a release-prefixed tag shares its digest (hotio)", async () => {
      const current = image("sha256:radarr-6.4.4", {
        created: created(20),
        labels: { "org.opencontainers.image.version": "6.4.4.10685" },
      });
      const requests = serveOciRegistry({
        repository: "hotio/radarr",
        tags: {
          "release-6.4.3.10645": image("sha256:radarr-6.4.3", { created: created(10) }),
          "release-6.4.4.10685": current,
          "nightly-6.5.0.10700": image("sha256:radarr-nightly", { created: created(21) }),
          latest: current,
        },
      });

      const release = await expectRelease(lookupGhcr("ghcr.io/hotio/radarr:latest"));

      expect(release).toMatchObject({
        latestRelease: "6.4.4.10685",
        resolvedFromTag: "latest",
        latestReleaseAt: new Date(created(20)),
        releaseUrl: "https://github.com/hotio/radarr/pkgs/container/radarr",
      });
      expect(requests.some((request) => request.url.pathname.endsWith("/tags/list"))).toBe(false);
    });

    test("resolves the label version when the version tag itself shares the digest", async () => {
      const current = image("sha256:homarr-2.7.0", {
        created: created(18),
        labels: { "org.opencontainers.image.version": "v2.7.0" },
      });
      serveOciRegistry({
        repository: "homarr-labs/homarr",
        tags: { "v2.6.0": image("sha256:homarr-2.6.0"), "v2.7.0": current, latest: current },
      });

      const release = await expectRelease(lookupGhcr("homarr-labs/homarr"));

      expect(release).toMatchObject({ latestRelease: "v2.7.0", resolvedFromTag: "latest" });
    });

    test("falls back to the newest version tags when the label points at another image", async () => {
      const current = image("sha256:current", {
        created: created(12),
        labels: { "org.opencontainers.image.version": "1.9.0" },
      });
      serveOciRegistry({
        repository: "owner/app",
        tags: { "1.9.0": image("sha256:old"), "2.0.0": current, latest: current },
      });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "2.0.0", resolvedFromTag: "latest" });
    });

    test("resolves the release tag through the version tag that shares its digest (Immich)", async () => {
      const current = image("sha256:immich-3.3.5", { created: created(15) });
      serveOciRegistry({
        repository: "immich-app/immich-server",
        tags: {
          "v3.3.4": image("sha256:immich-3.3.4"),
          "v3.3.5": current,
          "commit-0a1b2c3": image("sha256:commit"),
          "pr-12345": image("sha256:pr"),
          release: current,
        },
      });

      const release = await expectRelease(lookupGhcr("immich-app/immich-server"));

      expect(release).toMatchObject({ latestRelease: "v3.3.5", resolvedFromTag: "release" });
    });

    test("uses stable when there is no latest or release tag", async () => {
      const current = image("sha256:stable", { created: created(3) });
      serveOciRegistry({
        repository: "owner/app",
        tags: { "5.1.0": current, "5.2.0-rc.1": image("sha256:rc"), stable: current },
      });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "5.1.0", resolvedFromTag: "stable" });
    });

    test("prefers latest over release and stable", async () => {
      const latest = image("sha256:latest");
      serveOciRegistry({
        repository: "owner/app",
        tags: {
          "3.0.0": latest,
          "2.0.0": image("sha256:release"),
          latest,
          release: image("sha256:release"),
          stable: image("sha256:stable"),
        },
      });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "3.0.0", resolvedFromTag: "latest" });
    });

    test("keeps the floating tag name instead of a commit tag when no version shares its digest (Seerr)", async () => {
      const current = image("sha256:develop", { created: created(9) });
      serveOciRegistry({
        repository: "seerr-team/seerr",
        tags: { "sha-62ed636": current, "41dc7908-baseline": image("sha256:baseline"), latest: current },
      });

      const release = await expectRelease(lookupGhcr("seerr-team/seerr"));

      expect(release.latestRelease).toBe("latest");
      expect(release.resolvedFromTag).toBeUndefined();
      expect(release.latestReleaseAt).toEqual(new Date(created(9)));
    });

    test.each([
      { label: "latest", reason: "equals the floating tag" },
      { label: "main", reason: "is not a version" },
    ])("ignores an OCI version label that $reason", async ({ label }) => {
      const current = image("sha256:current", { labels: { "org.opencontainers.image.version": label } });
      serveOciRegistry({ repository: "owner/app", tags: { "1.2.3": current, latest: current } });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "1.2.3", resolvedFromTag: "latest" });
    });

    test("reads single-platform manifests without an image index", async () => {
      const current = image("sha256:single", { created: created(7), singlePlatform: true });
      serveOciRegistry({ repository: "owner/app", tags: { "0.4.0": current, latest: current } });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "0.4.0", latestReleaseAt: new Date(created(7)) });
    });

    test("finds the matching version tag on a later tag page", async () => {
      const current = image("sha256:current");
      serveOciRegistry({
        repository: "owner/app",
        tagPageSize: 2,
        tags: {
          "sha-1": image("sha256:1"),
          "sha-2": image("sha256:2"),
          "1.0.0": image("sha256:old"),
          "sha-3": image("sha256:3"),
          "1.1.0": current,
          latest: current,
        },
      });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "1.1.0", resolvedFromTag: "latest" });
    });
  });

  describe("without a floating tag", () => {
    test("uses the highest plain version tag, comparing numerically (Cleanuparr)", async () => {
      serveOciRegistry({
        repository: "cleanuparr/cleanuparr",
        tags: {
          "2.9.0": image("sha256:2.9.0", { created: created(1) }),
          "2.10.12": image("sha256:2.10.12", { created: created(5) }),
          "2.10.2": image("sha256:2.10.2", { created: created(28) }),
          "sha-abcdef": image("sha256:sha", { created: created(29) }),
        },
      });

      const release = await expectRelease(lookupGhcr("cleanuparr/cleanuparr"));

      expect(release).toMatchObject({ latestRelease: "2.10.12", latestReleaseAt: new Date(created(5)) });
      expect(release.resolvedFromTag).toBeUndefined();
    });

    test("falls back to the highest version-like tag when no plain version exists", async () => {
      serveOciRegistry({
        repository: "linuxserver/sonarr",
        tags: {
          "4.0.19.2950-ls5": image("sha256:old"),
          "4.0.20.3014-ls1": image("sha256:new"),
          "develop-4.1.0.100-ls2": image("sha256:develop"),
          "amd64-sha": image("sha256:arch"),
        },
      });

      const release = await expectRelease(lookupGhcr("linuxserver/sonarr"));

      expect(release.latestRelease).toBe("4.0.20.3014-ls1");
    });

    test("uses the newest of the last tags when no tag looks like a version", async () => {
      serveOciRegistry({
        repository: "owner/app",
        tags: {
          "sha-1111111": image("sha256:1", { created: created(1) }),
          "sha-2222222": image("sha256:2", { created: created(9) }),
          "sha-3333333": image("sha256:3", { created: created(4) }),
        },
      });

      const release = await expectRelease(lookupGhcr("owner/app"));

      expect(release).toMatchObject({ latestRelease: "sha-2222222", latestReleaseAt: new Date(created(9)) });
    });

    test("reports noReleasesFound for a package without tags", async () => {
      serveOciRegistry({ repository: "owner/empty", tags: {} });

      const error = await expectFailure(lookupGhcr("owner/empty"));

      expect(error.code).toBe("noReleasesFound");
    });
  });

  describe("version filters", () => {
    test("uses the highest matching tag and ignores floating tags", async () => {
      const latest = image("sha256:latest");
      serveOciRegistry({
        repository: "muchobien/pocketbase",
        tags: {
          "0.22.0": image("sha256:0.22.0", { created: created(1) }),
          "0.23.0": image("sha256:0.23.0", { created: created(2) }),
          "1.0.0": latest,
          latest,
        },
      });

      const release = await expectRelease(
        lookupGhcr("ghcr.io/muchobien/pocketbase:latest", { versionRegex: "^0\\.[0-9]+\\.[0-9]+$" }),
      );

      expect(release).toMatchObject({ latestRelease: "0.23.0", latestReleaseAt: new Date(created(2)) });
      expect(release.resolvedFromTag).toBeUndefined();
    });

    test("compares every number in the tag so the newest LinuxServer build wins", async () => {
      serveOciRegistry({
        repository: "linuxserver/sonarr",
        tags: {
          "4.0.15.2941-ls289": image("sha256:289"),
          "4.0.15.2941-ls290": image("sha256:290"),
          "4.0.14.2939-ls300": image("sha256:300"),
        },
      });

      const release = await expectRelease(
        lookupGhcr("linuxserver/sonarr", { versionRegex: "^\\d+(\\.\\d+)+-ls\\d+$" }),
      );

      expect(release.latestRelease).toBe("4.0.15.2941-ls290");
    });

    test("is not misled by numbers in a shared tag prefix", async () => {
      serveOciRegistry({
        repository: "owner/app",
        tags: {
          "amd64-1.10.0": image("sha256:110"),
          "amd64-1.2.0": image("sha256:12"),
          "arm64-2.0.0": image("sha256:arm"),
        },
      });

      const release = await expectRelease(lookupGhcr("owner/app", { versionRegex: "^amd64-" }));

      expect(release.latestRelease).toBe("amd64-1.10.0");
    });

    test("prefers the tag listed last when versions tie", async () => {
      serveOciRegistry({
        repository: "owner/app",
        tags: { "v1.2.3": image("sha256:old"), "1.2.3": image("sha256:new") },
      });

      const release = await expectRelease(lookupGhcr("owner/app", { versionRegex: "1\\.2\\.3" }));

      expect(release.latestRelease).toBe("1.2.3");
    });

    test("reports noMatchingVersion with the pattern and sample tags", async () => {
      serveOciRegistry({ repository: "owner/app", tags: { "1.0.0": image("sha256:1"), latest: image("sha256:1") } });

      const error = await expectFailure(lookupGhcr("owner/app", { versionRegex: "^9\\." }));

      expect(error.code).toBe("noMatchingVersion");
      expect(error.message).toContain("^9\\.");
      expect(error.message).toContain("1.0.0");
    });

    test("reports noReleasesFound when there are no tags to filter", async () => {
      serveOciRegistry({ repository: "owner/app", tags: {} });

      const error = await expectFailure(lookupGhcr("owner/app", { versionRegex: "^1\\." }));

      expect(error.code).toBe("noReleasesFound");
    });
  });

  describe("registry access", () => {
    test("requests an anonymous pull token for the repository", async () => {
      const current = image("sha256:current");
      const requests = serveOciRegistry({
        repository: "homarr-labs/homarr",
        tags: { "1.0.0": current, latest: current },
      });

      await expectRelease(lookupGhcr("homarr-labs/homarr"));

      const [tokenRequest] = requests;
      expect(tokenRequest?.url.toString().split("?")[0]).toBe("https://ghcr.io/token");
      expect(tokenRequest?.url.searchParams.get("service")).toBe("ghcr.io");
      expect(tokenRequest?.url.searchParams.get("scope")).toBe("repository:homarr-labs/homarr:pull");
      expect(tokenRequest?.headers.authorization).toBeUndefined();
    });

    test("exchanges a configured token with basic authentication", async () => {
      const current = image("sha256:current");
      const requests = serveOciRegistry({ repository: "owner/private", tags: { "1.0.0": current, latest: current } });

      await expectRelease(lookupGhcr("owner/private", { token: "ghp_secret" }));

      expect(requests[0]?.headers.authorization).toBe(`Basic ${Buffer.from("homarr:ghp_secret").toString("base64")}`);
    });

    test("uses a custom registry URL with a trailing slash", async () => {
      const current = image("sha256:current");
      const requests = serveOciRegistry({
        origin: "https://registry.example.com",
        repository: "homarr-labs/homarr",
        tags: { "1.0.0": current, latest: current },
      });

      await expectRelease(lookupGhcr("homarr-labs/homarr", { providerUrl: "https://registry.example.com/" }));

      expect(requests[0]?.url.searchParams.get("service")).toBe("registry.example.com");
      expect(requests.every((request) => request.url.origin === "https://registry.example.com")).toBe(true);
    });

    test("supports nested package names", async () => {
      const current = image("sha256:current");
      const requests = serveOciRegistry({ repository: "owner/team/app", tags: { "1.0.0": current, latest: current } });

      const release = await expectRelease(lookupGhcr("ghcr.io/owner/team/app:1.0.0"));

      expect(release).toMatchObject({ latestRelease: "1.0.0", resolvedFromTag: "latest" });
      expect(requests[0]?.url.searchParams.get("scope")).toBe("repository:owner/team/app:pull");
      expect(requests.at(-1)?.url.pathname.startsWith("/v2/owner/team/app/")).toBe(true);
    });

    test("uses the source and description labels for the project", async () => {
      const current = image("sha256:current", {
        labels: {
          "org.opencontainers.image.source": "https://github.com/Radarr/Radarr.git",
          "org.opencontainers.image.description": "Movie organizer",
        },
      });
      serveOciRegistry({ repository: "hotio/radarr", tags: { "1.0.0": current, latest: current } });

      const release = await expectRelease(lookupGhcr("hotio/radarr"));

      expect(release).toMatchObject({
        projectUrl: "https://github.com/Radarr/Radarr",
        projectDescription: "Movie organizer",
        releaseUrl: "https://github.com/Radarr/Radarr/pkgs/container/radarr",
      });
    });

    test("rejects an identifier without a package name before any request", async () => {
      const error = await expectFailure(lookupGhcr("ghcr.io/homarr-labs"));

      expect(error.code).toBe("invalidIdentifier");
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    test.each([
      { status: 404, code: "notFound" },
      { status: 429, code: "rateLimited" },
      { status: 500, code: "unexpected" },
      { status: 401, code: "unexpected" },
    ])("maps a $status token response to $code", async ({ status, code }) => {
      serveOciRegistry({ repository: "owner/app", tags: {}, tokenReply: { status, body: {} } });

      const error = await expectFailure(lookupGhcr("owner/app"));

      expect(error.code).toBe(code);
    });

    test("reports notFound when the repository does not exist", async () => {
      serveOciRegistry({ repository: "someone/else", tags: {} });

      const error = await expectFailure(lookupGhcr("owner/missing"));

      expect(error.code).toBe("notFound");
    });
  });
});
