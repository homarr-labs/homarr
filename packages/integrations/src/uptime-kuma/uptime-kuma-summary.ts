import type { UptimeKumaGroup, UptimeKumaMonitor, UptimeKumaMonitorStatus } from "./uptime-kuma-types";

export type UptimeKumaOverallStatus = "operational" | "degraded" | "outage" | "maintenance" | "unknown";

export interface UptimeKumaSummary {
  total: number;
  counts: Record<UptimeKumaMonitorStatus, number>;
  averageUptime24h: number | null;
  averagePing: number | null;
  overallStatus: UptimeKumaOverallStatus;
}

type SummarizableMonitor = Pick<UptimeKumaMonitor, "status" | "uptime24h" | "ping">;

export const getUniqueUptimeKumaMonitors = (groups: readonly UptimeKumaGroup[]): UptimeKumaMonitor[] => {
  const monitorsById = new Map<number, UptimeKumaMonitor>();
  for (const monitor of groups.flatMap((group) => group.monitors)) {
    if (!monitorsById.has(monitor.id)) monitorsById.set(monitor.id, monitor);
  }
  return [...monitorsById.values()];
};

export const summarizeUptimeKumaMonitors = (monitors: readonly SummarizableMonitor[]): UptimeKumaSummary => {
  const counts: Record<UptimeKumaMonitorStatus, number> = { up: 0, down: 0, pending: 0, maintenance: 0, unknown: 0 };
  for (const monitor of monitors) counts[monitor.status] += 1;

  return {
    total: monitors.length,
    counts,
    averageUptime24h: average(monitors.map((monitor) => monitor.uptime24h)),
    averagePing: average(monitors.map((monitor) => monitor.ping)),
    overallStatus: getOverallStatus(counts, monitors.length),
  };
};

const getOverallStatus = (counts: Record<UptimeKumaMonitorStatus, number>, total: number): UptimeKumaOverallStatus => {
  const known = total - counts.unknown;
  if (known === 0) return "unknown";
  if (counts.down === known) return "outage";
  if (counts.down + counts.pending > 0) return "degraded";
  if (counts.maintenance > 0) return "maintenance";
  return "operational";
};

const average = (values: readonly (number | null)[]): number | null => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};
