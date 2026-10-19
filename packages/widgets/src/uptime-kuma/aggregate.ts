import type { UptimeKumaDashboardData } from "@homarr/integrations/types";

export function aggregateUptimeKumaDashboards(dashboards: UptimeKumaDashboardData[]) {
  const combined = { totalMonitors: 0, upCount: 0, downCount: 0, pausedCount: 0, averageUptimePercent: 0 };
  let uptimeTotal = 0;
  let uptimeCount = 0;
  for (const dashboard of dashboards) {
    combined.totalMonitors += dashboard.totalMonitors;
    combined.upCount += dashboard.upCount;
    combined.downCount += dashboard.downCount;
    combined.pausedCount += dashboard.pausedCount;
    for (const monitor of dashboard.monitors) {
      if (monitor.uptimePercent24h === null) continue;
      uptimeTotal += monitor.uptimePercent24h;
      uptimeCount++;
    }
  }
  combined.averageUptimePercent = uptimeTotal / Math.max(uptimeCount, 1);
  return combined;
}
