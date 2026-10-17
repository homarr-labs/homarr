import type { UptimeKumaMonitor, UptimeKumaMonitorStatus, UptimeKumaStatusPage } from "@homarr/integrations/types";

export type UptimeKumaSortBy = "status" | "statusPage" | "name" | "uptime";

export interface LoadedStatusPage {
  integrationId: string;
  integrationName: string;
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
  unknown: 3,
  up: 4,
};

export const getAllMonitors = (pages: readonly LoadedStatusPage[]): MonitorEntry[] =>
  dedupe(pages.flatMap((page) => pageMonitors(page, page.statusPage.groups)));

export const getMonitorSections = (
  pages: readonly LoadedStatusPage[],
  { groupByStatusPageGroup, showOnlyProblems, sortBy }: MonitorSectionOptions,
): MonitorSection[] => {
  const prepare = (monitors: MonitorEntry[]) =>
    sortMonitors(
      monitors.filter((monitor) => !showOnlyProblems || monitor.status !== "up"),
      sortBy,
    );

  if (!groupByStatusPageGroup) {
    return [{ key: "all", title: null, monitors: prepare(getAllMonitors(pages)) }].filter(
      (section) => section.monitors.length > 0,
    );
  }

  return pages
    .flatMap((page) =>
      page.statusPage.groups.map((group) => ({
        key: `${page.integrationId}:${group.id}`,
        title: pages.length > 1 ? `${page.statusPage.title} · ${group.name}` : group.name,
        monitors: prepare(dedupe(pageMonitors(page, [group]))),
      })),
    )
    .filter((section) => section.monitors.length > 0);
};

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

const pageMonitors = (page: LoadedStatusPage, groups: UptimeKumaStatusPage["groups"]) =>
  groups
    .flatMap((group) => group.monitors)
    .map((monitor) => ({ ...monitor, key: `${page.integrationId}:${monitor.id}` }));

const dedupe = (monitors: readonly Omit<MonitorEntry, "order">[]): MonitorEntry[] => {
  const byKey = new Map<string, MonitorEntry>();
  for (const monitor of monitors) {
    if (!byKey.has(monitor.key)) byKey.set(monitor.key, { ...monitor, order: byKey.size });
  }
  return [...byKey.values()];
};
