import { describe, expect, it } from "vitest";

import { normalizeReleaseProviderIdentifier } from "../release-provider";

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
