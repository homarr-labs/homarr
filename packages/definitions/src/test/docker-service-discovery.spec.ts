import { describe, expect, test } from "vitest";

import { buildDockerServiceUrlCandidates, matchDockerService } from "../docker-service-discovery";

describe("matchDockerService", () => {
  test("reports image matches with high confidence and name fallbacks with medium confidence", () => {
    expect(matchDockerService({ image: "linuxserver/sonarr:latest", name: "media" })).toEqual({
      kind: "sonarr",
      confidence: "high",
      source: "image",
    });
    expect(matchDockerService({ image: "custom/media:latest", name: "sonarr" })).toEqual({
      kind: "sonarr",
      confidence: "medium",
      source: "name",
    });
  });
});

describe("buildDockerServiceUrlCandidates", () => {
  test("never emits wildcard or socket-path browser URLs", () => {
    const candidates = buildDockerServiceUrlCandidates({
      containerName: "sonarr",
      endpointHost: "/var/run/docker.sock",
      preferredPort: 8989,
      ports: [{ IP: "0.0.0.0", PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }],
    });

    expect(candidates.map(({ url }) => url)).not.toContain("http://0.0.0.0:8989");
    expect(candidates.map(({ url }) => url)).not.toContain("http:///var/run/docker.sock:8989");
    expect(candidates[0]).toMatchObject({
      url: "http://sonarr:8989",
      scopes: ["server"],
      reason: "sharedContainerNetwork",
    });
    expect(candidates.at(-1)).toMatchObject({ url: "", reason: "manualHostRequired" });
  });

  test("uses a remote Docker endpoint hostname for wildcard published ports", () => {
    const candidates = buildDockerServiceUrlCandidates({
      containerName: "sonarr",
      endpointHost: "docker.example.test:2375",
      preferredPort: 8989,
      ports: [{ IP: "0.0.0.0", PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }],
    });

    expect(candidates[0]).toMatchObject({
      url: "http://docker.example.test:8989",
      scopes: ["browser", "server"],
      reason: "dockerEndpointHost",
    });
  });
});
