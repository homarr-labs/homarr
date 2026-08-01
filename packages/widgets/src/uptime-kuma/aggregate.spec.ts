import { describe, expect, it } from "vitest";

import { aggregateUptimeKumaDashboards } from "./aggregate";

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
