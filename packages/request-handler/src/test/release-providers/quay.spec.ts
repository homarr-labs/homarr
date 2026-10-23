import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProviderReply } from "./provider-server";
import { expectFailure, expectRelease, isRequest, mockedFetch, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

const day = (value: number) => new Date(Date.UTC(2026, 7, value)).toUTCString();

const quayTag = (name: string, modified: number, digest: string) => ({
  name,
  last_modified: day(modified),
  manifest_digest: digest,
});

const serveQuay = (reply: ProviderReply) =>
  serveProvider((request) => {
    if (isRequest(request, "GET", "https://quay.io/api/v1/repository/prometheus/prometheus")) return reply;
    return undefined;
  });

const tagsOf = (...tags: ReturnType<typeof quayTag>[]) => Object.fromEntries(tags.map((tag) => [tag.name, tag]));

describe("Quay releases", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test("resolves latest to the version tag with the same manifest digest", async () => {
    serveQuay({
      body: {
        description: "Monitoring system",
        tags: tagsOf(
          quayTag("latest", 20, "sha256:b"),
          quayTag("v3.15.1", 20, "sha256:b"),
          quayTag("v3.15.0", 2, "sha256:a"),
          quayTag("main", 21, "sha256:c"),
        ),
      },
    });

    const release = await expectRelease({ provider: "quay", identifier: "quay.io/prometheus/prometheus:latest" });

    expect(release).toEqual({
      latestRelease: "v3.15.1",
      latestReleaseAt: new Date(day(20)),
      resolvedFromTag: "latest",
      projectUrl: "https://quay.io/repository/prometheus/prometheus",
      projectDescription: "Monitoring system",
      releaseUrl: "https://quay.io/repository/prometheus/prometheus/tag/v3.15.1",
    });
  });

  test("uses the highest tag that matches the version filter", async () => {
    serveQuay({
      body: {
        tags: tagsOf(
          quayTag("v2.55.1", 9, "sha256:a"),
          quayTag("v3.0.0", 1, "sha256:b"),
          quayTag("latest", 9, "sha256:a"),
        ),
      },
    });

    const release = await expectRelease({
      provider: "quay",
      identifier: "prometheus/prometheus",
      versionRegex: "^v2\\.",
    });

    expect(release.latestRelease).toBe("v2.55.1");
  });

  test("ignores tags without a modification date", async () => {
    serveQuay({
      body: {
        tags: { "v9.0.0": { name: "v9.0.0", last_modified: null }, ...tagsOf(quayTag("v1.0.0", 1, "sha256:a")) },
      },
    });

    const release = await expectRelease({ provider: "quay", identifier: "prometheus/prometheus" });

    expect(release.latestRelease).toBe("v1.0.0");
  });

  test("reports noReleasesFound without tags", async () => {
    serveQuay({ body: { tags: {} } });

    const error = await expectFailure({ provider: "quay", identifier: "prometheus/prometheus" });

    expect(error.code).toBe("noReleasesFound");
  });

  test("reports notFound for an unknown repository", async () => {
    serveQuay({ status: 404 });

    const error = await expectFailure({ provider: "quay", identifier: "prometheus/prometheus" });

    expect(error.code).toBe("notFound");
  });

  test("rejects an identifier without a repository name", async () => {
    const error = await expectFailure({ provider: "quay", identifier: "prometheus" });

    expect(error.code).toBe("invalidIdentifier");
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
