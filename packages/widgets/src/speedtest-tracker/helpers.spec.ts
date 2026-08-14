import { describe, expect, it } from "vitest";

import type { SpeedtestTrackerDashboardData, SpeedtestTrackerStats } from "@homarr/integrations/types";

import { combineSpeedtestDashboards, getAvailableSpeedtestDashboards, getCompactSections, mergeStats } from "./helpers";

const stats = (average: number, totalResults: number): SpeedtestTrackerStats => ({
  ping: { avg: average, min: average, max: average },
  download: { avg: average, avg_bits: average, min: average, max: average },
  upload: { avg: average, avg_bits: average, min: average, max: average },
  total_results: totalResults,
});

describe("speedtest dashboard aggregation", () => {
  it("weights averages by result count", () => {
    expect(mergeStats(stats(10, 1), stats(20, 3))?.ping.avg).toBe(17.5);
  });

  it("selects the newest latest result independent of integration order", () => {
    const older = { id: 1, ping: 1, download_bits: 1, upload_bits: 1, healthy: true, created_at: new Date(1) };
    const newer = { ...older, id: 2, created_at: new Date(2) };
    const dashboards: SpeedtestTrackerDashboardData[] = [
      { latestResult: newer, stats: null, recentResults: [] },
      { latestResult: older, stats: null, recentResults: [] },
    ];
    expect(combineSpeedtestDashboards(dashboards).latestResult?.id).toBe(2);
  });
});

describe("speedtest source ownership", () => {
  it("keeps integration identity when upstream result ids overlap", () => {
    const result = { id: 1, ping: 1, download_bits: 1, upload_bits: 1, healthy: true, created_at: new Date(1) };
    const dashboard = { latestResult: result, stats: null, recentResults: [result] };

    expect(
      getAvailableSpeedtestDashboards([
        { integrationId: "speed-a", integrationName: "Speed A", dashboard },
        { integrationId: "speed-b", integrationName: "Speed B", dashboard },
      ]).map(({ integrationId, integrationName }) => ({ integrationId, integrationName })),
    ).toEqual([
      { integrationId: "speed-a", integrationName: "Speed A" },
      { integrationId: "speed-b", integrationName: "Speed B" },
    ]);
  });
});

describe("getCompactSections", () => {
  const available = { latest: true, chart: true, averages: true };

  it("prioritizes the latest result in a short widget", () => {
    expect(getCompactSections(180, available)).toEqual({ latest: true, chart: false, averages: false });
  });

  it("reveals history before averages as height grows", () => {
    expect(getCompactSections(300, available)).toEqual({ latest: true, chart: true, averages: false });
    expect(getCompactSections(400, available)).toEqual({ latest: true, chart: true, averages: true });
  });
});
