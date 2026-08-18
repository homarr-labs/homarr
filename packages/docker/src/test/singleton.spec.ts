import { beforeEach, describe, expect, test, vi } from "vitest";

import { DockerSingleton } from "../singleton";

const mockEnv = vi.hoisted(() => ({
  DOCKER_SOCKET_PATHS: undefined as string | undefined,
  DOCKER_HOSTNAMES: undefined as string | undefined,
  DOCKER_PORTS: undefined as string | undefined,
  DOCKER_ENDPOINTS: undefined as string | undefined,
  ENABLE_DOCKER: true,
  ENABLE_KUBERNETES: false,
}));

vi.mock("dockerode", () => {
  return {
    default: class MockDocker {
      constructor(public opts?: Record<string, unknown>) {}
    },
  };
});

vi.mock("../env", () => ({
  env: mockEnv,
}));

describe("DockerSingleton", () => {
  beforeEach(() => {
    // Reset singleton cache between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (DockerSingleton as any).instances = null;

    // Reset env to defaults
    mockEnv.DOCKER_SOCKET_PATHS = undefined;
    mockEnv.DOCKER_HOSTNAMES = undefined;
    mockEnv.DOCKER_PORTS = undefined;
    mockEnv.DOCKER_ENDPOINTS = undefined;
  });

  test("should return default socket when no env vars set", () => {
    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(1);
    expect(instances[0]?.host).toBe("/var/run/docker.sock");
    expect(instances[0]).toMatchObject({ endpointId: "socket:default", endpointName: "Local Docker" });
    const options = (instances[0]?.instance as unknown as { opts: { socketPath: string } } | undefined)?.opts;
    expect(options?.socketPath).toBe("/var/run/docker.sock");
  });

  test("should return TCP instances only when DOCKER_HOSTNAMES and DOCKER_PORTS set", () => {
    mockEnv.DOCKER_HOSTNAMES = "remote-host";
    mockEnv.DOCKER_PORTS = "2375";

    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(1);
    expect(instances[0]?.host).toBe("remote-host:2375");
  });

  test("should return multiple TCP instances", () => {
    mockEnv.DOCKER_HOSTNAMES = "host1,host2";
    mockEnv.DOCKER_PORTS = "2375,2376";

    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(2);
    expect(instances[0]?.host).toBe("host1:2375");
    expect(instances[1]?.host).toBe("host2:2376");
    expect(instances.map(({ endpointId }) => endpointId)).toEqual(["tcp:host1:2375", "tcp:host2:2376"]);
  });

  test("should throw when hostname and port counts do not match", () => {
    mockEnv.DOCKER_HOSTNAMES = "host1,host2";
    mockEnv.DOCKER_PORTS = "2375";

    expect(() => DockerSingleton.getInstances()).toThrow("The number of hosts and ports must match");
  });

  test("should return socket instances when DOCKER_SOCKET_PATHS set", () => {
    mockEnv.DOCKER_SOCKET_PATHS = "/var/run/docker.sock";

    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(1);
    expect(instances[0]?.host).toBe("/var/run/docker.sock");
  });

  test("should return multiple socket instances", () => {
    mockEnv.DOCKER_SOCKET_PATHS = "/var/run/docker.sock,/run/user/1000/podman/podman.sock";

    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(2);
    expect(instances[0]?.host).toBe("/var/run/docker.sock");
    expect(instances[1]?.host).toBe("/run/user/1000/podman/podman.sock");
    expect(DockerSingleton.findInstance("socket:/run/user/1000/podman/podman.sock")).toBe(instances[1]);
  });

  test("should combine socket and TCP instances", () => {
    mockEnv.DOCKER_SOCKET_PATHS = "/var/run/docker.sock,/run/user/1000/podman/podman.sock";
    mockEnv.DOCKER_HOSTNAMES = "remote-host";
    mockEnv.DOCKER_PORTS = "2375";

    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(3);
    expect(instances[0]?.host).toBe("/var/run/docker.sock");
    expect(instances[1]?.host).toBe("/run/user/1000/podman/podman.sock");
    expect(instances[2]?.host).toBe("remote-host:2375");
  });

  test("should cache instances on subsequent calls", () => {
    const first = DockerSingleton.getInstances();
    const second = DockerSingleton.getInstances();

    expect(first).toBe(second);
  });

  test("uses the structured endpoint descriptor and exposes scoped capabilities", () => {
    mockEnv.DOCKER_ENDPOINTS = JSON.stringify([
      {
        id: "readonly-podman",
        name: "Read-only Podman",
        kind: "podman",
        transport: { type: "socket", path: "/run/podman/podman.sock" },
        capabilities: ["inventory", "logs"],
      },
    ]);

    const [endpoint] = DockerSingleton.getInstances();

    expect(endpoint).toMatchObject({ endpointId: "readonly-podman", endpointName: "Read-only Podman" });
    expect(endpoint?.descriptor).toMatchObject({ kind: "podman", source: "environment" });
    expect(DockerSingleton.hasCapability("readonly-podman", "logs")).toBe(true);
    expect(DockerSingleton.hasCapability("readonly-podman", "remove")).toBe(false);
  });

  test("isolates an unreadable TLS endpoint from healthy endpoints", () => {
    mockEnv.DOCKER_ENDPOINTS = JSON.stringify([
      { id: "local", name: "Local", transport: { type: "socket", path: "/var/run/docker.sock" } },
      {
        id: "broken-tls",
        name: "Broken TLS",
        transport: { type: "tls", host: "broken.example", port: 2376, caPath: "/missing/docker-ca.pem" },
      },
    ]);

    expect(DockerSingleton.getInstances().map(({ endpointId }) => endpointId)).toEqual(["local"]);
    expect(DockerSingleton.getInitializationFailures()).toEqual([
      expect.objectContaining({ descriptor: expect.objectContaining({ id: "broken-tls" }) }),
    ]);
  });
});
