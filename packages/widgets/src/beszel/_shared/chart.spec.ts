import { describe, expect, test } from "vitest";

import type { BeszelSystemStatsRecord } from "@homarr/integrations/types";

import { buildDiskChartData, buildGpuChartData, buildGpuDevices, hasGpuMetric, padLiveTimeGrid } from "./chart";

const record = (
  created: string,
  du: number,
  efs: BeszelSystemStatsRecord["stats"]["efs"],
): BeszelSystemStatsRecord => ({
  id: created,
  system: "system-1",
  type: "1m",
  created,
  updated: created,
  stats: {
    cpu: 0,
    m: 0,
    mu: 0,
    mp: 0,
    mb: 0,
    s: 0,
    su: 0,
    d: 938.8,
    du,
    dp: 51.15,
    efs,
  },
});

describe("buildDiskChartData", () => {
  test("keeps root and extra filesystem usage in GiB without stacking or byte conversion", () => {
    const data = buildDiskChartData(
      [
        record("2026-07-11T13:46:00.000Z", 455.81, {
          sda: { d: 1906.8, du: 1656.45, r: 0, w: 0 },
          sdb: { d: 5587.04, du: 3936.86, r: 0, w: 0 },
          sdc: { d: 3724.18, du: 1589.84, r: 0, w: 0 },
        }),
      ],
      ["sda", "sdb", "sdc"],
      "Root",
      "1h",
    );

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ Root: 455.81, sda: 1656.45, sdb: 3936.86, sdc: 1589.84 });
  });

  test("uses zero for a filesystem missing from an individual sample and orders historical records oldest first", () => {
    const data = buildDiskChartData(
      [
        record("2026-07-11T13:47:00.000Z", 2, { sda: { d: 10, du: 4, r: 0, w: 0 } }),
        record("2026-07-11T13:46:00.000Z", 1, undefined),
      ],
      ["sda"],
      "Root",
      "1h",
    );

    expect(data.map((point) => ({ Root: point.Root, sda: point.sda }))).toEqual([
      { Root: 1, sda: 0 },
      { Root: 2, sda: 4 },
    ]);
  });
});

describe("padLiveTimeGrid", () => {
  test("keeps a fixed 60-second window with the newest sample at the right edge", () => {
    const data = padLiveTimeGrid([{ time: "13:51:30", rawTime: "2026-07-11T13:51:30.217Z", CPU: 18.07 }]);

    expect(data).toHaveLength(60);
    expect(data[0]).not.toHaveProperty("CPU");
    expect(data[58]).not.toHaveProperty("CPU");
    expect(data[59]).toMatchObject({ CPU: 18.07 });
  });

  test("leaves null gaps for missing seconds instead of stretching existing points", () => {
    const data = padLiveTimeGrid([
      { time: "13:51:28", rawTime: "2026-07-11T13:51:28.000Z", CPU: 10 },
      { time: "13:51:30", rawTime: "2026-07-11T13:51:30.000Z", CPU: 20 },
    ]);

    expect(data.slice(-3).map((point) => point.CPU)).toEqual([10, undefined, 20]);
  });
});

describe("buildGpuChartData", () => {
  test("uses stable GPU ID and model labels across samples", () => {
    const first = record("2026-07-11T13:46:00.000Z", 0, undefined);
    first.stats.g = {
      "0": { n: "RTX 3090", u: 10, mu: 1024, p: 150 },
      "1": { n: "RTX 3090", u: 20, mu: 2048, p: 175 },
    };
    const second = record("2026-07-11T13:47:00.000Z", 0, undefined);
    second.stats.g = { "0": { n: "RTX 3090", u: 30, mu: 4096, p: 200 } };

    const devices = [
      { id: "0", seriesName: "RTX 3090 (0)" },
      { id: "1", seriesName: "RTX 3090 (1)" },
    ];
    const data = buildGpuChartData([second, first], devices, "usage", "1h");

    expect(data.map((point) => ({ zero: point["RTX 3090 (0)"], one: point["RTX 3090 (1)"] }))).toEqual([
      { zero: 10, one: 20 },
      { zero: 30, one: 0 },
    ]);
    expect(buildGpuChartData([second, first], devices, "memory", "1h").map((point) => point["RTX 3090 (0)"])).toEqual([
      1024 * 1024 * 1024,
      4096 * 1024 * 1024,
    ]);
    expect(buildGpuChartData([second, first], devices, "power", "1h").map((point) => point["RTX 3090 (0)"])).toEqual([
      150, 200,
    ]);
  });

  test("returns no data when no GPU stats are available", () => {
    expect(buildGpuDevices(undefined)).toEqual([]);
    expect(buildGpuChartData(undefined, [], "usage")).toEqual([]);
  });

  test("keeps same-model GPUs distinct and orders them by device ID", () => {
    const sample = record("2026-07-11T13:46:00.000Z", 0, undefined);
    sample.stats.g = {
      "1": { n: "RTX 3090", u: 20 },
      "0": { n: "RTX 3090", u: 10 },
    };

    expect(buildGpuDevices([sample])).toEqual([
      { id: "0", seriesName: "RTX 3090 (0)" },
      { id: "1", seriesName: "RTX 3090 (1)" },
    ]);
  });

  test("uses zero for unavailable optional metrics and preserves the live window", () => {
    const sample = record("2026-07-11T13:51:30.000Z", 0, undefined);
    sample.stats.g = { "0": { n: "RTX 3090", u: 10 } };
    const devices = [{ id: "0", seriesName: "RTX 3090 (0)" }];

    expect(buildGpuChartData([sample], devices, "memory", "1m").at(-1)?.["RTX 3090 (0)"]).toBe(0);
    expect(buildGpuChartData([sample], devices, "power", "1m").at(-1)?.["RTX 3090 (0)"]).toBe(0);
    expect(buildGpuChartData([sample], devices, "usage", "1m")).toHaveLength(60);
  });

  test("distinguishes missing optional GPU metrics from reported zero values", () => {
    const sample = record("2026-07-11T13:51:30.000Z", 0, undefined);
    sample.stats.g = { "0": { n: "RTX 3090", u: 0 } };

    expect(hasGpuMetric([sample], "memory")).toBe(false);
    expect(hasGpuMetric([sample], "power")).toBe(false);

    sample.stats.g = { "0": { n: "RTX 3090", u: 0, mu: 0, p: 0 } };

    expect(hasGpuMetric([sample], "memory")).toBe(true);
    expect(hasGpuMetric([sample], "power")).toBe(true);
  });
});
