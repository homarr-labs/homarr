import type { ContainerStats } from "dockerode";
import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { DockerSingleton } from "@homarr/docker";

import {
  calculateCpuUsage,
  calculateMemoryUsage,
  dockerContainersRequestHandler,
  getDockerEndpointsAsync,
  getContainersWithStatsAsync,
  hasDockerEndpointCapability,
} from "../docker";

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

// Helper to create a partial stats object, cast to ContainerStats.
// This mirrors what Podman and other Docker-compatible runtimes may return
// at runtime, even though @types/dockerode declares all fields as required.
const createStats = (overrides: Record<string, unknown> = {}) => overrides as unknown as ContainerStats;

describe("calculateCpuUsage", () => {
  test("should return 0 when cpu_stats is undefined (Podman)", () => {
    const stats = createStats({ cpu_stats: undefined });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should return 0 when online_cpus is 0", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 0, cpu_usage: { total_usage: 1000 }, system_cpu_usage: 5000 },
    });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should return 0 when online_cpus is undefined", () => {
    const stats = createStats({
      cpu_stats: { cpu_usage: { total_usage: 1000 }, system_cpu_usage: 5000 },
    });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should return 0 when cpu_usage is undefined", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 4, system_cpu_usage: 5000 },
    });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should return 0 when total_usage is 0", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 4, cpu_usage: { total_usage: 0 }, system_cpu_usage: 5000 },
    });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should return 0 when system_cpu_usage is 0", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 4, cpu_usage: { total_usage: 1000 }, system_cpu_usage: 0 },
    });
    expect(calculateCpuUsage(stats)).toBe(0);
  });

  test("should calculate correct CPU percentage for valid stats", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 4, cpu_usage: { total_usage: 2000 }, system_cpu_usage: 10000 },
    });
    // (2000 / 10000) * 4 * 100 = 80
    expect(calculateCpuUsage(stats)).toBe(80);
  });

  test("should handle fractional CPU usage", () => {
    const stats = createStats({
      cpu_stats: { online_cpus: 2, cpu_usage: { total_usage: 500 }, system_cpu_usage: 100000 },
    });
    // (500 / 100000) * 2 * 100 = 1
    expect(calculateCpuUsage(stats)).toBe(1);
  });
});

describe("calculateMemoryUsage", () => {
  test("should return 0 when memory_stats is undefined (Podman)", () => {
    const stats = createStats({ memory_stats: undefined });
    expect(calculateMemoryUsage(stats)).toBe(0);
  });

  test("should return 0 when memory_stats.usage is 0", () => {
    const stats = createStats({ memory_stats: { usage: 0 } });
    expect(calculateMemoryUsage(stats)).toBe(0);
  });

  test("should return 0 when memory_stats.usage is undefined", () => {
    const stats = createStats({ memory_stats: {} });
    expect(calculateMemoryUsage(stats)).toBe(0);
  });

  test("should subtract cache from usage", () => {
    const stats = createStats({
      memory_stats: { usage: 1000, stats: { cache: 200 } },
    });
    expect(calculateMemoryUsage(stats)).toBe(800);
  });

  test("should use total_inactive_file when cache is absent", () => {
    const stats = createStats({
      memory_stats: { usage: 1000, stats: { total_inactive_file: 300 } },
    });
    expect(calculateMemoryUsage(stats)).toBe(700);
  });

  test("should use inactive_file as last fallback", () => {
    const stats = createStats({
      memory_stats: { usage: 1000, stats: { inactive_file: 150 } },
    });
    expect(calculateMemoryUsage(stats)).toBe(850);
  });

  test("should return raw usage when memory_stats.stats is undefined", () => {
    const stats = createStats({ memory_stats: { usage: 512 } });
    expect(calculateMemoryUsage(stats)).toBe(512);
  });
});

describe("getContainersWithStatsAsync", () => {
  test("queries only selected Docker endpoints and leaves an empty selection as all", async () => {
    const firstListContainers = vi.fn(async () => []);
    const secondListContainers = vi.fn(async () => []);
    vi.spyOn(DockerSingleton, "getInstances").mockReturnValue([
      createDockerInstance("first", firstListContainers),
      createDockerInstance("second", secondListContainers),
    ] as never);
    vi.spyOn(DockerSingleton, "getInitializationFailures").mockReturnValue([]);

    try {
      const selectedResult = await getContainersWithStatsAsync(50, ["second"]);

      expect(firstListContainers).not.toHaveBeenCalled();
      expect(secondListContainers).toHaveBeenCalledOnce();
      expect(selectedResult.endpoints.map(({ id }) => id)).toEqual(["second"]);

      await getContainersWithStatsAsync(50, []);

      expect(firstListContainers).toHaveBeenCalledOnce();
      expect(secondListContainers).toHaveBeenCalledTimes(2);
    } finally {
      vi.restoreAllMocks();
    }
  });

  test("marks a timed-out endpoint unavailable without blocking healthy endpoints", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(DockerSingleton, "getInstances").mockReturnValue([
        createDockerInstance("stalled", () => new Promise(() => undefined)),
        createDockerInstance("healthy", async () => []),
      ] as never);

      const resultPromise = getContainersWithStatsAsync(50);
      await vi.advanceTimersByTimeAsync(50);
      const result = await resultPromise;

      expect(result.endpoints).toEqual([
        expect.objectContaining({ id: "stalled", status: "unavailable" }),
        expect.objectContaining({ id: "healthy", status: "available" }),
      ]);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  test("marks an endpoint degraded and returns zeroed stats when its stats request times out", async () => {
    vi.useFakeTimers();
    try {
      const dockerInstance = createDockerInstance("healthy", async () => [
        {
          Id: "container-1",
          Image: "sonarr:latest",
          Labels: {},
          Names: ["/sonarr"],
          State: "running",
          Ports: [],
        },
      ]);
      let observedSignal: AbortSignal | undefined;
      dockerInstance.instance.getContainer = (() => ({
        stats: (options: { abortSignal?: AbortSignal }) => {
          observedSignal = options.abortSignal;
          return new Promise(() => undefined);
        },
      })) as never;
      vi.spyOn(DockerSingleton, "getInstances").mockReturnValue([dockerInstance] as never);
      vi.spyOn(DockerSingleton, "findInstance").mockReturnValue(dockerInstance as never);

      const resultPromise = getContainersWithStatsAsync(50);
      await vi.advanceTimersByTimeAsync(50);
      const result = await resultPromise;

      expect(observedSignal?.aborted).toBe(true);
      expect(result.containers).toEqual([expect.objectContaining({ id: "container-1", cpuUsage: 0, memoryUsage: 0 })]);
      expect(result.endpoints).toEqual([expect.objectContaining({ id: "healthy", status: "degraded" })]);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  test("includes endpoints that failed during TLS initialization", async () => {
    vi.spyOn(DockerSingleton, "getInstances").mockReturnValue([]);
    vi.spyOn(DockerSingleton, "getInitializationFailures").mockReturnValue([
      {
        host: "broken.example:2376",
        descriptor: {
          id: "broken-tls",
          name: "Broken TLS",
          kind: "docker",
          transport: { type: "tls", host: "broken.example", port: 2376, caPath: "/missing/ca.pem" },
          capabilities: ["inventory"],
          scope: "admin",
          source: "environment",
        },
      },
    ]);

    const result = await getContainersWithStatsAsync(50);

    expect(result.endpoints).toEqual([
      expect.objectContaining({ id: "broken-tls", status: "unavailable", transport: "tls" }),
    ]);
    vi.restoreAllMocks();
  });
});

test("demo mode advertises and filters the same inventory-only endpoint", async () => {
  const previousDemoMode = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "true";
  try {
    expect(getDockerEndpointsAsync()).toEqual([
      expect.objectContaining({ id: "demo", name: "Demo Docker", capabilities: ["inventory"] }),
    ]);

    const selected = await dockerContainersRequestHandler.handler({ endpointIds: ["demo"] }).getDataAsync();
    expect(selected.data.endpoints).toEqual([expect.objectContaining({ id: "demo" })]);
    expect(selected.data.containers.length).toBeGreaterThan(0);

    const excluded = await dockerContainersRequestHandler.handler({ endpointIds: ["other"] }).getDataAsync();
    expect(excluded.data).toEqual({ containers: [], endpoints: [] });

    expect(hasDockerEndpointCapability("demo", "inventory")).toBe(true);
    expect(hasDockerEndpointCapability("demo", "logs")).toBe(false);
    expect(hasDockerEndpointCapability("other", "inventory")).toBe(false);
  } finally {
    dockerContainersRequestHandler.invalidateCache();
    if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previousDemoMode;
  }
});

const createDockerInstance = (endpointId: string, listContainers: () => Promise<unknown[]>) => ({
  endpointId,
  endpointName: endpointId,
  host: endpointId,
  descriptor: {
    kind: "docker",
    transport: { type: "socket" },
    capabilities: ["inventory"],
    source: "environment",
    scope: "admin",
  },
  instance: { listContainers, getContainer: () => ({}) },
});
