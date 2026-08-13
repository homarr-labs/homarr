import { describe, expect, test } from "vitest";

import { parseDockerEndpointDescriptors } from "../endpoint-descriptor";

describe("parseDockerEndpointDescriptors", () => {
  test("parses friendly TLS and read-only Podman endpoints", () => {
    const descriptors = parseDockerEndpointDescriptors(
      JSON.stringify([
        {
          id: "nas",
          name: "NAS Docker",
          transport: { type: "tls", host: "nas.internal", port: 2376, caPath: "/run/secrets/docker-ca" },
        },
        {
          id: "podman",
          name: "Build host",
          kind: "podman",
          transport: { type: "socket", path: "/run/podman/podman.sock" },
          capabilities: ["inventory", "logs"],
        },
      ]),
    );

    expect(descriptors).toEqual([
      expect.objectContaining({ id: "nas", name: "NAS Docker", kind: "docker", source: "environment" }),
      expect.objectContaining({ id: "podman", kind: "podman", capabilities: ["inventory", "logs"] }),
    ]);
  });

  test("requires an explicit opt-in for plaintext TCP", () => {
    expect(() =>
      parseDockerEndpointDescriptors(
        JSON.stringify([{ id: "nas", name: "NAS", transport: { type: "tcp", host: "nas", port: 2375 } }]),
      ),
    ).toThrow("allowInsecure: true");
  });

  test("rejects duplicate identities and capabilities without inventory", () => {
    expect(() =>
      parseDockerEndpointDescriptors(
        JSON.stringify([
          { id: "same", name: "A", transport: { type: "socket", path: "/a" } },
          { id: "same", name: "B", transport: { type: "socket", path: "/b" } },
        ]),
      ),
    ).toThrow("ids must be unique");
    expect(() =>
      parseDockerEndpointDescriptors(
        JSON.stringify([
          {
            id: "limited",
            name: "Limited",
            transport: { type: "socket", path: "/run/docker.sock" },
            capabilities: ["logs"],
          },
        ]),
      ),
    ).toThrow("must include inventory");
  });

  test("returns independent default capability arrays", () => {
    const [first, second] = parseDockerEndpointDescriptors(
      JSON.stringify([
        { id: "first", name: "First", transport: { type: "socket", path: "/first.sock" } },
        { id: "second", name: "Second", transport: { type: "socket", path: "/second.sock" } },
      ]),
    );

    expect(first?.capabilities).not.toBe(second?.capabilities);
  });
});
