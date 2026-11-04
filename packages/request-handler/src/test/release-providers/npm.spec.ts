import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, resetProviderState, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const nextPackage = {
  name: "next",
  "dist-tags": { latest: "16.0.1", canary: "16.1.0-canary.3" },
  time: {
    created: "2016-01-01T00:00:00.000Z",
    modified: "2026-10-20T00:00:00.000Z",
    "15.5.6": "2026-09-01T00:00:00.000Z",
    "16.0.1": "2026-10-01T00:00:00.000Z",
    "15.5.7": "2026-10-10T00:00:00.000Z",
    "16.1.0-canary.3": "2026-10-19T00:00:00.000Z",
  },
  versions: {
    "15.5.6": { description: "The React Framework" },
    "15.5.7": { description: "The React Framework" },
    "16.0.1": { description: "The React Framework" },
    "16.1.0-canary.3": {},
  },
};

const serveRegistry = (path: string, reply: ProviderReply) =>
  serveProvider((request) => {
    if (request.url.origin === "https://registry.npmjs.org" && request.url.pathname === path) return reply;
    return undefined;
  });

describe("npm releases", () => {
  beforeEach(() => {
    resetProviderState();
  });

  test("returns the latest dist-tag even when a backport was published later", async () => {
    serveRegistry("/next", { body: nextPackage });

    const release = await expectRelease({ provider: "npm", identifier: "next" });

    expect(release).toEqual({
      latestRelease: "16.0.1",
      latestReleaseAt: new Date("2026-10-01T00:00:00.000Z"),
      releaseUrl: "https://www.npmjs.com/package/next/v/16.0.1",
      releaseDescription: "The React Framework",
    });
  });

  test("returns the newest version matching the pattern", async () => {
    serveRegistry("/next", { body: nextPackage });

    const release = await expectRelease({ provider: "npm", identifier: "next", versionRegex: "^15\\." });

    expect(release.latestRelease).toBe("15.5.7");
  });

  test("ignores the created and modified metadata entries", async () => {
    serveRegistry("/next", { body: nextPackage });

    const error = await expectFailure({ provider: "npm", identifier: "next", versionRegex: "^(created|modified)$" });

    expect(error.code).toBe("noMatchingVersion");
  });

  test("uses the newest version when the package has no latest dist-tag", async () => {
    serveRegistry("/next", { body: { ...nextPackage, "dist-tags": undefined } });

    const release = await expectRelease({ provider: "npm", identifier: "next" });

    expect(release.latestRelease).toBe("16.1.0-canary.3");
  });

  test("encodes scoped package names", async () => {
    const requests = serveRegistry("/%40homarr%2Fcli", {
      body: {
        name: "@homarr/cli",
        "dist-tags": { latest: "1.0.0" },
        time: { "1.0.0": "2026-01-01T00:00:00Z" },
        versions: { "1.0.0": {} },
      },
    });

    const release = await expectRelease({ provider: "npm", identifier: "@homarr/cli" });

    expect(release.releaseUrl).toBe("https://www.npmjs.com/package/%40homarr%2Fcli/v/1.0.0");
    expect(requests).toHaveLength(1);
  });

  test("sends a configured token as a bearer token", async () => {
    const requests = serveRegistry("/next", { body: nextPackage });

    await expectRelease({ provider: "npm", identifier: "next", token: "npm_secret" });

    expect(requests[0]?.headers.authorization).toBe("Bearer npm_secret");
  });

  test("reports noReleasesFound for a package without versions", async () => {
    serveRegistry("/next", { body: { name: "next", time: { created: "2016-01-01T00:00:00Z" }, versions: {} } });

    const error = await expectFailure({ provider: "npm", identifier: "next" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("reports notFound for an unknown package", async () => {
    serveRegistry("/next", { status: 404 });

    const error = await expectFailure({ provider: "npm", identifier: "next" });

    expect(error.code).toBe("notFound");
  });
});
