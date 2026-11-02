import { describe, expect, it } from "vitest";

import {
  normalizeReleaseProviderIdentifier,
  releaseIdentifierForImageTag,
  splitReleaseProviderReference,
} from "../release-provider";

describe("normalizeReleaseProviderIdentifier", () => {
  it("normalizes full ghcr image references", () => {
    expect(normalizeReleaseProviderIdentifier("gitHubContainerRegistry", "ghcr.io/muchobien/pocketbase:latest")).toBe(
      "muchobien/pocketbase",
    );
    expect(normalizeReleaseProviderIdentifier("gitHubContainerRegistry", "ghcr.io/homarr-labs/homarr:latest")).toBe(
      "homarr-labs/homarr",
    );
  });

  it("keeps existing ghcr owner/name identifiers unchanged", () => {
    expect(normalizeReleaseProviderIdentifier("gitHubContainerRegistry", "homarr-labs/homarr")).toBe(
      "homarr-labs/homarr",
    );
  });

  it("normalizes container image identifiers for other registries", () => {
    expect(normalizeReleaseProviderIdentifier("dockerHub", "postgres:17")).toBe("postgres");
    expect(normalizeReleaseProviderIdentifier("dockerHub", "docker.io/library/postgres:17")).toBe("library/postgres");
    expect(normalizeReleaseProviderIdentifier("dockerHub", "library/postgres@sha256:abc123")).toBe("library/postgres");
    expect(normalizeReleaseProviderIdentifier("linuxServerIO", "lscr.io/linuxserver/radarr:latest")).toBe(
      "linuxserver/radarr",
    );
    expect(normalizeReleaseProviderIdentifier("quay", "quay.io/prometheus/prometheus:v3.0.0")).toBe(
      "prometheus/prometheus",
    );
  });
});

describe("splitReleaseProviderReference", () => {
  it("keeps a container branch tag separate from the repository", () => {
    expect(splitReleaseProviderReference("dockerHub", "golift/unpackerr:nightly")).toEqual({
      identifier: "golift/unpackerr",
      tag: "nightly",
    });
    expect(splitReleaseProviderReference("dockerHub", "docker.io/library/postgres:17")).toEqual({
      identifier: "library/postgres",
      tag: "17",
    });
    expect(splitReleaseProviderReference("dockerHub", "owner/app:nightly@sha256:abc")).toEqual({
      identifier: "owner/app",
      tag: "nightly",
    });
    expect(splitReleaseProviderReference("gitHubContainerRegistry", "ghcr.io/hotio/radarr:master")).toEqual({
      identifier: "hotio/radarr",
      tag: "master",
    });
  });

  it("leaves an untagged repository without a tag", () => {
    expect(splitReleaseProviderReference("dockerHub", "golift/unpackerr")).toEqual({
      identifier: "golift/unpackerr",
      tag: undefined,
    });
    expect(splitReleaseProviderReference("dockerHub", "library/postgres@sha256:abc123")).toEqual({
      identifier: "library/postgres",
      tag: undefined,
    });
    expect(splitReleaseProviderReference("github", "homarr-labs/homarr")).toEqual({
      identifier: "homarr-labs/homarr",
      tag: undefined,
    });
  });
});

describe("releaseIdentifierForImageTag", () => {
  it("records a branch tag and leaves latest and numeric tags to the default track", () => {
    expect(releaseIdentifierForImageTag("golift/unpackerr", "nightly")).toBe("golift/unpackerr:nightly");
    expect(releaseIdentifierForImageTag("golift/unpackerr", "master")).toBe("golift/unpackerr:master");
    expect(releaseIdentifierForImageTag("golift/unpackerr", "latest")).toBe("golift/unpackerr");
    expect(releaseIdentifierForImageTag("golift/unpackerr", undefined)).toBe("golift/unpackerr");
    expect(releaseIdentifierForImageTag("library/postgres", "17")).toBe("library/postgres");
  });
});
