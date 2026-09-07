import { describe, expect, test } from "vitest";

import type { BeszelSystemStatsRecord } from "@homarr/integrations/types";

import { buildDiskChartData, normalizeBeszelByteRate, padLiveTimeGrid } from "./chart";

const GIBIBYTE = 1024 ** 3;

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
  test("normalizes root and extra filesystem usage to bytes without stacking", () => {
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
    expect(data[0]).toMatchObject({
      Root: 455.81 * GIBIBYTE,
      sda: 1656.45 * GIBIBYTE,
      sdb: 3936.86 * GIBIBYTE,
      sdc: 1589.84 * GIBIBYTE,
    });
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
      { Root: GIBIBYTE, sda: 0 },
      { Root: 2 * GIBIBYTE, sda: 4 * GIBIBYTE },
    ]);
  });
});

describe("normalizeBeszelByteRate", () => {
  test("converts legacy MiB/s values to bytes/s", () => {
    expect(normalizeBeszelByteRate(undefined, 1.5)).toBe(1.5 * 1024 ** 2);
  });

  test("keeps the preferred bytes/s value authoritative, including zero", () => {
    expect(normalizeBeszelByteRate(0, 1.5)).toBe(0);
    expect(normalizeBeszelByteRate(1_500_000, 1.5)).toBe(1_500_000);
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
