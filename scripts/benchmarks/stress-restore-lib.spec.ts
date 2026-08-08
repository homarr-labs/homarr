import { describe, expect, it } from "vitest";

import {
  getGrowthBytesPerHour,
  getNodeProcesses,
  getPrimaryNodeRssBytes,
  parseStressSnapshot,
  stressMemoryScript,
  sumNodeRssBytes,
  summarizeStress,
  toMiB,
} from "./stress-restore-lib.mts";

const snapshot = ({
  current = 300 * 1024 * 1024,
  peak = 400 * 1024 * 1024,
  processes = ["1|0|4096|nginx|2048", "20|1|204800|node|180000", "30|1|8192|redis-server|4096"],
  redis = true,
}: {
  current?: number;
  peak?: number;
  processes?: string[];
  redis?: boolean;
} = {}) =>
  [
    `memory_current=${current}`,
    `memory_peak=${peak}`,
    "cgroup_anon=250000000",
    "cgroup_file=50000000",
    ...processes.map((process) => `process=${process}`),
    ...(redis ? ["redis_used_memory=1048576", "redis_used_memory_peak=2097152"] : []),
  ].join("\n");

describe("parseStressSnapshot", () => {
  it("parses cgroup totals, processes and redis", () => {
    const checkpoint = parseStressSnapshot("01-boot-idle", 1_234, snapshot());

    expect(checkpoint.name).toBe("01-boot-idle");
    expect(checkpoint.elapsedMs).toBe(1_234);
    expect(checkpoint.container.currentBytes).toBe(300 * 1024 * 1024);
    expect(checkpoint.container.peakBytes).toBe(400 * 1024 * 1024);
    expect(checkpoint.container.anonymousBytes).toBe(250_000_000);
    expect(checkpoint.processes).toHaveLength(3);
    expect(checkpoint.redis).toEqual({ usedMemoryBytes: 1_048_576, peakMemoryBytes: 2_097_152 });
  });

  it("converts process RSS and PSS from KiB to bytes", () => {
    const [, node] = parseStressSnapshot("x", 0, snapshot()).processes;

    expect(node?.command).toBe("node");
    expect(node?.rssBytes).toBe(204_800 * 1024);
    expect(node?.pssBytes).toBe(180_000 * 1024);
  });

  it("throws when memory_current is absent so a bad snapshot never scores as 0 MiB", () => {
    expect(() => parseStressSnapshot("broken", 0, "cgroup_anon=1\n")).toThrow(/memory_current/);
  });

  it("tolerates a missing redis section", () => {
    expect(parseStressSnapshot("x", 0, snapshot({ redis: false })).redis).toBeNull();
  });

  it("skips malformed process lines rather than emitting NaN samples", () => {
    const checkpoint = parseStressSnapshot("x", 0, snapshot({ processes: ["garbage", "20|1|100|node|50"] }));

    expect(checkpoint.processes).toHaveLength(1);
    expect(checkpoint.processes[0]?.command).toBe("node");
  });

  it("defaults PSS to zero when smaps_rollup is unreadable", () => {
    const checkpoint = parseStressSnapshot("x", 0, snapshot({ processes: ["20|1|100|node|0"] }));

    expect(checkpoint.processes[0]?.pssBytes).toBe(0);
  });
});

describe("node process selection", () => {
  it("counts only node processes, excluding nginx and redis", () => {
    const checkpoint = parseStressSnapshot("x", 0, snapshot());

    expect(getNodeProcesses(checkpoint).map((p) => p.command)).toEqual(["node"]);
    expect(sumNodeRssBytes(checkpoint)).toBe(204_800 * 1024);
  });

  it("sums multiple node processes but reports the largest as primary", () => {
    const checkpoint = parseStressSnapshot(
      "x",
      0,
      snapshot({ processes: ["20|1|200000|node|1", "21|20|50000|node|1"] }),
    );

    expect(sumNodeRssBytes(checkpoint)).toBe(250_000 * 1024);
    expect(getPrimaryNodeRssBytes(checkpoint)).toBe(200_000 * 1024);
  });
});

describe("getGrowthBytesPerHour", () => {
  it("returns null below two samples", () => {
    expect(getGrowthBytesPerHour([])).toBeNull();
    expect(getGrowthBytesPerHour([{ elapsedMs: 0, bytes: 1 }])).toBeNull();
  });

  it("extrapolates a linear climb to bytes per hour", () => {
    // +1 MiB every minute => +60 MiB/hour.
    const samples = [0, 1, 2, 3].map((minute) => ({
      elapsedMs: minute * 60_000,
      bytes: minute * 1024 * 1024,
    }));

    expect(getGrowthBytesPerHour(samples)).toBe(60 * 1024 * 1024);
  });

  it("reports a flat series as zero growth", () => {
    const samples = [0, 1, 2].map((minute) => ({ elapsedMs: minute * 60_000, bytes: 500 }));

    expect(getGrowthBytesPerHour(samples)).toBe(0);
  });

  it("returns null when every sample shares one timestamp", () => {
    expect(
      getGrowthBytesPerHour([
        { elapsedMs: 5, bytes: 1 },
        { elapsedMs: 5, bytes: 2 },
      ]),
    ).toBeNull();
  });

  it("reports shrinking memory as negative growth", () => {
    const samples = [
      { elapsedMs: 0, bytes: 100 * 1024 * 1024 },
      { elapsedMs: 3_600_000, bytes: 50 * 1024 * 1024 },
    ];

    expect(getGrowthBytesPerHour(samples)).toBe(-50 * 1024 * 1024);
  });
});

describe("summarizeStress", () => {
  const build = (name: string, currentMiB: number, elapsedMs: number) =>
    parseStressSnapshot(name, elapsedMs, snapshot({ current: currentMiB * 1024 * 1024, peak: 900 * 1024 * 1024 }));

  it("surfaces the headline lifecycle numbers", () => {
    const summary = summarizeStress([
      build("01-boot-idle", 200, 0),
      build("04-board-loaded", 450, 60_000),
      build("05-after-stress", 600, 120_000),
    ]);

    expect(summary.headline.bootIdleMiB).toBe(200);
    expect(summary.headline.boardLoadedMiB).toBe(450);
    expect(summary.headline.afterStressMiB).toBe(600);
    expect(summary.headline.peakMiB).toBe(900);
    expect(summary.checkpointCount).toBe(3);
  });

  it("derives soak growth only from soak checkpoints", () => {
    const summary = summarizeStress([
      build("01-boot-idle", 1_000, 0),
      build("soak-01", 100, 0),
      build("soak-02", 200, 3_600_000),
    ]);

    expect(summary.headline.soakGrowthMiBPerHour).toBe(100);
  });

  it("leaves headline fields null when their checkpoints were not captured", () => {
    const summary = summarizeStress([build("soak-01", 100, 0)]);

    expect(summary.headline.bootIdleMiB).toBeNull();
    expect(summary.headline.boardLoadedMiB).toBeNull();
    expect(summary.headline.soakGrowthMiBPerHour).toBeNull();
  });

  it("reports the peak redis footprint across checkpoints", () => {
    expect(summarizeStress([build("01-boot-idle", 100, 0)]).redisPeakMiB).toBe(2);
  });
});

describe("stressMemoryScript", () => {
  it("reads cgroup v2 memory.current, which is what the container limit applies to", () => {
    expect(stressMemoryScript).toContain("/sys/fs/cgroup/memory.current");
  });

  it("avoids ${...} so JS never interpolates a shell expansion away", () => {
    // String.raw suppresses backslash escapes but NOT ${...} interpolation, so the
    // script must not contain any — `dirname` replaces the usual ${var%/suffix}.
    expect(stressMemoryScript).not.toContain("${");
    expect(stressMemoryScript).toContain('dirname "$status_file"');
  });

  it("defaults PSS to 0 so an unreadable smaps_rollup cannot emit an empty field", () => {
    expect(stressMemoryScript).toContain("process_pss=0");
  });
});

describe("toMiB", () => {
  it("rounds to one decimal place", () => {
    expect(toMiB(1024 * 1024)).toBe(1);
    expect(toMiB(1.55 * 1024 * 1024)).toBe(1.6);
  });
});
