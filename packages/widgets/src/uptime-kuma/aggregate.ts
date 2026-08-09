import type { UptimeKumaDashboardData } from "@homarr/integrations/types";

const emptyDashboard: UptimeKumaDashboardData = {
  totalMonitors: 0,
  upCount: 0,
  downCount: 0,
  pausedCount: 0,
  averageUptimePercent: 0,
  monitors: [],
};

export function aggregateUptimeKumaDashboards(dashboards: UptimeKumaDashboardData[]): UptimeKumaDashboardData {
  const combined = dashboards.reduce<UptimeKumaDashboardData>(
    (acc, dashboard) => ({
      totalMonitors: acc.totalMonitors + dashboard.totalMonitors,
      upCount: acc.upCount + dashboard.upCount,
      downCount: acc.downCount + dashboard.downCount,
      pausedCount: acc.pausedCount + dashboard.pausedCount,
      averageUptimePercent: 0,
      monitors: [...acc.monitors, ...dashboard.monitors],
    }),
    emptyDashboard,
  );
  const uptimeValues = combined.monitors
    .map((monitor) => monitor.uptimePercent24h)
    .filter((value): value is number => value !== null);
  combined.averageUptimePercent =
    uptimeValues.reduce((total, value) => total + value, 0) / Math.max(uptimeValues.length, 1);
  return combined;
}
