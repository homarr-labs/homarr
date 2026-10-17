import type { UptimeKumaMonitor, UptimeKumaMonitorStatus, UptimeKumaStatusPage } from "@homarr/integrations/types";
import { getUniqueUptimeKumaMonitors } from "@homarr/integrations/types";

export type UptimeKumaSortBy = "status" | "statusPage" | "name" | "uptime";

export interface LoadedStatusPage {
  integrationId: string;
  statusPage: UptimeKumaStatusPage;
}

export interface MonitorEntry extends UptimeKumaMonitor {
  key: string;
  order: number;
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
  paused: 3,
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
  const sections = groupByStatusPageGroup
    ? pages.flatMap((page) =>
        page.statusPage.groups.map((group) => ({
          key: `${page.integrationId}:${group.id}`,
          title: pages.length > 1 ? `${page.statusPage.title} · ${group.name}` : group.name,
          monitors: prepare(toEntries(page, group.monitors)),
        })),
      )
    : [{ key: "all", title: null, monitors: prepare(getAllMonitors(pages)) }];

  return sections.filter((section) => section.monitors.length > 0);
};

export const filterProblems = (monitors: readonly MonitorEntry[], showOnlyProblems: boolean) =>
  monitors.filter((monitor) => !showOnlyProblems || monitor.status !== "up");

export const sortMonitors = (monitors: readonly MonitorEntry[], sortBy: UptimeKumaSortBy): MonitorEntry[] =>
  monitors.toSorted((left, right) => compareMonitors(left, right, sortBy) || left.order - right.order);

const compareMonitors = (left: MonitorEntry, right: MonitorEntry, sortBy: UptimeKumaSortBy) => {
  switch (sortBy) {
    case "status":
      return statusRank[left.status] - statusRank[right.status];
    case "name":
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
    case "uptime":
      return (left.uptime24h ?? Number.POSITIVE_INFINITY) - (right.uptime24h ?? Number.POSITIVE_INFINITY);
    case "statusPage":
      return 0;
  }
};

const toEntries = (page: LoadedStatusPage, monitors: readonly UptimeKumaMonitor[]): MonitorEntry[] =>
  monitors.map((monitor, order) => ({ ...monitor, key: `${page.integrationId}:${monitor.id}`, order }));
