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

  test.each(["127.0.0.1", "127.12.0.9", "::1", "::ffff:127.0.0.1", "localhost"])(
    "does not advertise loopback address %s to browsers",
    (address) => {
      const candidates = buildDockerServiceUrlCandidates({
        containerName: "sonarr",
        endpointHost: "socket",
        preferredPort: 8989,
        ports: [{ IP: address, PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }],
      });

      expect(candidates.some(({ source }) => source === "publishedAddress")).toBe(false);
      expect(candidates.some(({ url, scopes }) => url.includes(address) && scopes.includes("browser"))).toBe(false);
    },
  );

  test("does not use a loopback Docker endpoint as a browser URL", () => {
    const candidates = buildDockerServiceUrlCandidates({
      containerName: "sonarr",
      endpointHost: "[::1]:2375",
      preferredPort: 8989,
      ports: [{ IP: "0.0.0.0", PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }],
    });

    expect(candidates.some(({ source }) => source === "endpointHost")).toBe(false);
  });

  test.each(["tcp://10.0.0.5:2375", "unix:///var/run/docker.sock", "https://10.0.0.5"])(
    "rejects a scheme-bearing endpoint host %s as a browser URL",
    (endpointHost) => {
      const candidates = buildDockerServiceUrlCandidates({
        containerName: "sonarr",
        endpointHost,
        preferredPort: 8989,
        ports: [{ IP: "0.0.0.0", PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }],
      });

      expect(candidates.some(({ source }) => source === "endpointHost")).toBe(false);
    },
  );
});
