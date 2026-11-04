import type { UptimeKumaGroup, UptimeKumaMonitor, UptimeKumaMonitorStatus } from "./uptime-kuma-types";

export type UptimeKumaOverallStatus = "operational" | "degraded" | "outage" | "maintenance" | "unknown";

export interface UptimeKumaSummary {
  total: number;
  counts: Record<UptimeKumaMonitorStatus, number>;
  averageUptime24h: number | null;
  overallStatus: UptimeKumaOverallStatus;
}

type SummarizableMonitor = Pick<UptimeKumaMonitor, "status" | "uptime24h">;

const inactiveStatuses = new Set<UptimeKumaMonitorStatus>(["stale", "unknown"]);

export const isInactiveUptimeKumaStatus = (status: UptimeKumaMonitorStatus) => inactiveStatuses.has(status);

export const getUniqueUptimeKumaMonitors = (groups: readonly UptimeKumaGroup[]): UptimeKumaMonitor[] => [
  ...new Map(groups.flatMap((group) => group.monitors).map((monitor) => [monitor.id, monitor])).values(),
];

export const summarizeUptimeKumaMonitors = (monitors: readonly SummarizableMonitor[]): UptimeKumaSummary => {
  const counts: Record<UptimeKumaMonitorStatus, number> = {
    up: 0,
    down: 0,
    pending: 0,
    maintenance: 0,
    stale: 0,
    unknown: 0,
  };
  for (const monitor of monitors) counts[monitor.status] += 1;
  const activeMonitors = monitors.filter((monitor) => !isInactiveUptimeKumaStatus(monitor.status));

  return {
    total: monitors.length,
    counts,
    averageUptime24h: average(activeMonitors.map((monitor) => monitor.uptime24h)),
    overallStatus: getOverallStatus(counts, activeMonitors.length),
  };
};

const getOverallStatus = (
  counts: Record<UptimeKumaMonitorStatus, number>,
  activeCount: number,
): UptimeKumaOverallStatus => {
  if (activeCount === 0) return "unknown";
  if (counts.down === activeCount) return "outage";
  if (counts.down + counts.pending > 0) return "degraded";
  if (counts.maintenance > 0) return "maintenance";
  if (counts.stale + counts.unknown > 0) return "unknown";
  return "operational";
};

const average = (values: readonly (number | null)[]) => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};
