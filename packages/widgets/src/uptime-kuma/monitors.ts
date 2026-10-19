import type { UptimeKumaMonitor, UptimeKumaMonitorStatus, UptimeKumaStatusPage } from "@homarr/integrations/types";
import { getUniqueUptimeKumaMonitors, isInactiveUptimeKumaStatus } from "@homarr/integrations/types";

import type { WidgetComponentProps } from "../definition";

type UptimeKumaSortBy = WidgetComponentProps<"uptimeKuma">["options"]["sortBy"];

export interface LoadedStatusPage {
  integrationId: string;
  statusPage: UptimeKumaStatusPage;
}

export interface MonitorEntry extends UptimeKumaMonitor {
  key: string;
}

export interface MonitorSection {
  key: string;
  title: string | null;
  monitors: MonitorEntry[];
}

interface MonitorSectionOptions {
  groupByStatusPageGroup: boolean;
  showOnlyProblems: boolean;
  sortBy: UptimeKumaSortBy;
}

const statusRank: Record<UptimeKumaMonitorStatus, number> = {
  down: 0,
  pending: 1,
  maintenance: 2,
  stale: 3,
  unknown: 4,
  up: 5,
};

export const getAllMonitors = (pages: readonly LoadedStatusPage[]): MonitorEntry[] =>
  pages.flatMap((page) => toEntries(page, getUniqueUptimeKumaMonitors(page.statusPage.groups)));

export const getMonitorSections = (
  pages: readonly LoadedStatusPage[],
  { groupByStatusPageGroup, showOnlyProblems, sortBy }: MonitorSectionOptions,
): MonitorSection[] => {
  const prepare = (monitors: MonitorEntry[]) => sortMonitors(filterProblems(monitors, showOnlyProblems), sortBy);
  if (!groupByStatusPageGroup) {
    return [{ key: "all", title: null, monitors: prepare(getAllMonitors(pages)) }].filter(hasMonitors);
  }

  const sections = pages.flatMap((page) =>
    page.statusPage.groups.map((group) => ({
      key: `${page.integrationId}:${group.id}`,
      title: pages.length > 1 ? `${page.statusPage.title} · ${group.name}` : group.name,
      monitors: prepare(toEntries(page, group.monitors)),
    })),
  );
  return sections.filter(hasMonitors);
};

const hasMonitors = (section: MonitorSection) => section.monitors.length > 0;

const filterProblems = (monitors: readonly MonitorEntry[], showOnlyProblems: boolean) =>
  monitors.filter((monitor) => !showOnlyProblems || monitor.status !== "up");

export const needsAttention = (monitor: MonitorEntry) =>
  monitor.status !== "up" && !isInactiveUptimeKumaStatus(monitor.status);

export const sortMonitors = (monitors: readonly MonitorEntry[], sortBy: UptimeKumaSortBy): MonitorEntry[] =>
  monitors.toSorted((left, right) => compareMonitors(left, right, sortBy));

const compareMonitors = (left: MonitorEntry, right: MonitorEntry, sortBy: UptimeKumaSortBy) => {
  switch (sortBy) {
    case "status":
      return statusRank[left.status] - statusRank[right.status];
    case "name":
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
    case "uptime":
      return compareNullsLast(left.uptime24h, right.uptime24h);
    case "statusPage":
      return 0;
  }
};

const compareNullsLast = (left: number | null, right: number | null) => {
  if (left === null || right === null) return Number(left === null) - Number(right === null);
  return left - right;
};

const toEntries = (page: LoadedStatusPage, monitors: readonly UptimeKumaMonitor[]): MonitorEntry[] =>
  monitors.map((monitor) => ({ ...monitor, key: `${page.integrationId}:${monitor.id}` }));
