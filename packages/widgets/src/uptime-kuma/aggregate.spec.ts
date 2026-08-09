import { describe, expect, it } from "vitest";

import { aggregateUptimeKumaDashboards } from "./aggregate";
import { getCompactStatLimit, getCompactStatPriority } from "./component";

describe("aggregateUptimeKumaDashboards", () => {
  it("weights uptime by monitors instead of integrations", () => {
    const combined = aggregateUptimeKumaDashboards([
      {
        totalMonitors: 1,
        upCount: 1,
        downCount: 0,
        pausedCount: 0,
        averageUptimePercent: 100,
        monitors: [{ id: 1, name: "one", status: "up", uptimePercent24h: 100 }],
      },
      {
        totalMonitors: 3,
        upCount: 0,
        downCount: 3,
        pausedCount: 0,
        averageUptimePercent: 0,
        monitors: [
          { id: 2, name: "two", status: "down", uptimePercent24h: 0 },
          { id: 3, name: "three", status: "down", uptimePercent24h: 0 },
          { id: 4, name: "four", status: "down", uptimePercent24h: 0 },
        ],
      },
    ]);
    expect(combined.averageUptimePercent).toBe(25);
  });
});

describe("getCompactStatLimit", () => {
  it("reserves compact height for the uptime summary", () => {
    expect(getCompactStatLimit(150, true, 4)).toBe(0);
    expect(getCompactStatLimit(220, true, 4)).toBe(2);
  });

  it("uses the space for metrics when the summary is disabled", () => {
    expect(getCompactStatLimit(100, false, 4)).toBe(2);
    expect(getCompactStatLimit(240, false, 4)).toBe(4);
  });
});

describe("getCompactStatPriority", () => {
  it("puts active failures before healthy totals", () => {
    expect(getCompactStatPriority("downCount", 2)).toBeLessThan(getCompactStatPriority("totalMonitors", 10));
    expect(getCompactStatPriority("pausedCount", 1)).toBeLessThan(getCompactStatPriority("upCount", 8));
  });

  it("moves zero-value problem states behind healthy totals", () => {
    expect(getCompactStatPriority("downCount", 0)).toBeGreaterThan(getCompactStatPriority("upCount", 8));
  });
});
