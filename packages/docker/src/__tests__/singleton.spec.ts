import { beforeEach, describe, expect, test, vi } from "vitest";

// Use vi.hoisted so the mock env object is available in hoisted vi.mock factories
const mockEnv = vi.hoisted(() => ({
  DOCKER_SOCKET_PATHS: undefined as string | undefined,
  DOCKER_HOSTNAMES: undefined as string | undefined,
  DOCKER_PORTS: undefined as string | undefined,
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

import { DockerSingleton } from "../singleton";

describe("DockerSingleton", () => {
  beforeEach(() => {
    // Reset singleton cache between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (DockerSingleton as any).instances = null;

    // Reset env to defaults
    mockEnv.DOCKER_SOCKET_PATHS = undefined;
    mockEnv.DOCKER_HOSTNAMES = undefined;
    mockEnv.DOCKER_PORTS = undefined;
  });

  test("should return default socket when no env vars set", () => {
    const instances = DockerSingleton.getInstances();

    expect(instances).toHaveLength(1);
    expect(instances[0]?.host).toBe("socket");
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
});
