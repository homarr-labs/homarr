import { formatNumber } from "@homarr/common";
import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerResult,
  SpeedtestTrackerStats,
} from "@homarr/integrations/types";

export const mergeStats = (
  statsA: SpeedtestTrackerDashboardData["stats"],
  statsB: SpeedtestTrackerDashboardData["stats"],
): SpeedtestTrackerDashboardData["stats"] => {
  if (!statsB) return statsA;
  if (!statsA) return statsB;
  const totalResults = statsA.total_results + statsB.total_results;
  const weightedAverage = (left: number, right: number) =>
    totalResults > 0 ? (left * statsA.total_results + right * statsB.total_results) / totalResults : (left + right) / 2;
  return {
    ping: {
      avg: weightedAverage(statsA.ping.avg, statsB.ping.avg),
      min: Math.min(statsA.ping.min, statsB.ping.min),
      max: Math.max(statsA.ping.max, statsB.ping.max),
    },
    download: {
      avg: weightedAverage(statsA.download.avg, statsB.download.avg),
      avg_bits:
        statsA.download.avg_bits !== undefined && statsB.download.avg_bits !== undefined
          ? weightedAverage(statsA.download.avg_bits, statsB.download.avg_bits)
          : (statsA.download.avg_bits ?? statsB.download.avg_bits),
      min: Math.min(statsA.download.min, statsB.download.min),
      max: Math.max(statsA.download.max, statsB.download.max),
    },
    upload: {
      avg: weightedAverage(statsA.upload.avg, statsB.upload.avg),
      avg_bits:
        statsA.upload.avg_bits !== undefined && statsB.upload.avg_bits !== undefined
          ? weightedAverage(statsA.upload.avg_bits, statsB.upload.avg_bits)
          : (statsA.upload.avg_bits ?? statsB.upload.avg_bits),
      min: Math.min(statsA.upload.min, statsB.upload.min),
      max: Math.max(statsA.upload.max, statsB.upload.max),
    },
    total_results: totalResults,
  };
};

export const selectLatestResult = (
  current: SpeedtestTrackerResult | null,
  candidate: SpeedtestTrackerResult | null,
): SpeedtestTrackerResult | null => {
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate.created_at.getTime() > current.created_at.getTime() ? candidate : current;
};

export const combineSpeedtestDashboards = (
  dashboards: SpeedtestTrackerDashboardData[],
): SpeedtestTrackerDashboardData =>
  dashboards.reduce<SpeedtestTrackerDashboardData>(
    (combined, dashboard) => ({
      latestResult: selectLatestResult(combined.latestResult, dashboard.latestResult),
      stats: mergeStats(combined.stats, dashboard.stats),
      recentResults: [...combined.recentResults, ...dashboard.recentResults],
    }),
    { latestResult: null, stats: null, recentResults: [] },
  );

export const formatBitsPerSec = (bps: number): string => `${formatNumber(bps, 2)}bps`;

export const formatResultSpeed = (result: SpeedtestTrackerResult, dir: "download" | "upload"): string => {
  const bits = dir === "download" ? result.download_bits : result.upload_bits;
  if (bits != null) return formatBitsPerSec(bits);
  return "—";
};

export const formatStatsSpeed = (band: SpeedtestTrackerStats["download"]): string => {
  if (band.avg_bits != null) return formatBitsPerSec(band.avg_bits);
  return formatBitsPerSec(band.avg * 8);
};
