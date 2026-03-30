import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerResult,
  SpeedtestTrackerStats,
} from "@homarr/integrations/types";

/**
 * Parse a Speedtest Tracker timestamp. The API returns UTC timestamps without
 * a timezone indicator (e.g. "2026-03-28 05:45:00"). We append "Z" to force
 * UTC parsing so JS converts it to local time correctly.
 */
export const parseTimestamp = (timestamp: string): Date => new Date(`${timestamp.replace(" ", "T")}Z`);

export const mergeStats = (
  statsA: SpeedtestTrackerDashboardData["stats"],
  statsB: SpeedtestTrackerDashboardData["stats"],
): SpeedtestTrackerDashboardData["stats"] => {
  if (!statsB) return statsA;
  if (!statsA) return statsB;
  return {
    ping: {
      avg: (statsA.ping.avg + statsB.ping.avg) / 2,
      min: Math.min(statsA.ping.min, statsB.ping.min),
      max: Math.max(statsA.ping.max, statsB.ping.max),
    },
    download: {
      avg: (statsA.download.avg + statsB.download.avg) / 2,
      avg_bits:
        statsA.download.avg_bits !== undefined && statsB.download.avg_bits !== undefined
          ? (statsA.download.avg_bits + statsB.download.avg_bits) / 2
          : (statsA.download.avg_bits ?? statsB.download.avg_bits),
      min: Math.min(statsA.download.min, statsB.download.min),
      max: Math.max(statsA.download.max, statsB.download.max),
    },
    upload: {
      avg: (statsA.upload.avg + statsB.upload.avg) / 2,
      avg_bits:
        statsA.upload.avg_bits !== undefined && statsB.upload.avg_bits !== undefined
          ? (statsA.upload.avg_bits + statsB.upload.avg_bits) / 2
          : (statsA.upload.avg_bits ?? statsB.upload.avg_bits),
      min: Math.min(statsA.upload.min, statsB.upload.min),
      max: Math.max(statsA.upload.max, statsB.upload.max),
    },
    total_results: statsA.total_results + statsB.total_results,
  };
};

export const formatBitsPerSec = (bps: number): string => {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  return `${bps} bps`;
};

export const formatResultSpeed = (result: SpeedtestTrackerResult, dir: "download" | "upload"): string => {
  const human = dir === "download" ? result.download_bits_human : result.upload_bits_human;
  if (human) return human;
  const bits = dir === "download" ? result.download_bits : result.upload_bits;
  if (bits != null) return formatBitsPerSec(bits);
  return "—";
};

export const formatStatsSpeed = (band: SpeedtestTrackerStats["download"]): string => {
  if (band.avg_bits_human) return band.avg_bits_human;
  if (band.avg_bits != null) return formatBitsPerSec(band.avg_bits);
  // avg is bytes/s — convert to bits/s
  return formatBitsPerSec(band.avg * 8);
};
