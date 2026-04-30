import type { ContainerStats } from "dockerode";
import { describe, expect, test, vi } from "vitest";

// Mock dayjs.duration which is called at module scope
vi.mock("dayjs", () => {
  const dayjs = vi.fn();
  dayjs.duration = vi.fn();
  return { default: dayjs };
});

// Mock modules that trigger server-side env validation on import
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@homarr/db", () => ({
  db: {},
  like: vi.fn(),
  or: vi.fn(),
}));

vi.mock("@homarr/db/schema", () => ({
  icons: { name: "name" },
}));

vi.mock("@homarr/docker", () => ({
  dockerLabels: { hide: "homarr.hide" },
  DockerSingleton: { getInstances: () => [] },
}));

vi.mock("@homarr/redis", () => ({
  createCacheChannel: vi.fn(),
  createWidgetOptionsChannel: vi.fn(),
}));

vi.mock("@homarr/definitions", () => ({
  widgetKinds: [],
}));

vi.mock("../lib/cached-widget-request-handler", () => ({
  createCachedWidgetRequestHandler: vi.fn(() => ({ handler: vi.fn() })),
}));

import { calculateCpuUsage, calculateMemoryUsage } from "../docker";

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
