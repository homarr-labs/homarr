import type { QueryKey } from "@tanstack/react-query";

export const queryCacheDefaultStaleTimeMs = 0;
export const queryCacheDefaultRefetchIntervalMs = 30_000;
export const queryCacheDefaultGcTimeMs = 1000 * 60 * 60 * 24;
export const queryCacheMaxValueBytes = 1024 * 1024;
export const queryCacheStoragePrefix = "homarr-widget-query";
export const queryCacheBuster = "v2-superjson";

export const widgetRefetchIntervalOverrides: Record<string, number> = {
  "widget.healthMonitoring": 5_000,
  "widget.dnsHole": 5_000,
  "widget.downloads": 5_000,
  "widget.mediaServer": 5_000,
  "widget.tracearr": 5_000,
  "widget.firewall.getFirewallCpuStatus": 5_000,
  "widget.firewall.getFirewallMemoryStatus": 15_000,
  "widget.firewall.getFirewallInterfacesStatus": 30_000,
  "widget.firewall.getFirewallVersionStatus": 3_600_000,
  "widget.anchorNotes": 15_000,
  "widget.coolify": 30_000,
  "widget.umami.getActiveVisitors": 30_000,
  "widget.umami": 300_000,
  "widget.calendar": 60_000,
  "widget.mediaRequests": 60_000,
  "widget.smartHome": 60_000,
  "widget.ups": 60_000,
  "widget.uptimeKuma": 60_000,
  "widget.weather": 60_000,
  "widget.timetable": 60_000,
  "widget.indexerManager": 300_000,
  "widget.mediaRelease": 300_000,
  "widget.mediaTranscoding": 300_000,
  "widget.networkController": 300_000,
  "widget.notifications": 300_000,
  "widget.rssFeed": 300_000,
  "widget.stockPrice": 300_000,
  "widget.minecraft": 300_000,
  "widget.vpn": 300_000,
  "widget.archiveTeamWarrior": 300_000,
  "widget.audiobookshelf": 600_000,
  "widget.navidrome": 600_000,
  "widget.speedtestTracker": 600_000,
  "widget.immich": 900_000,
  "widget.paperlessNgx": 900_000,
};

let activeQueryCacheBoardId: string | null = null;

export const setActiveQueryCacheBoardId = (boardId: string | null) => {
  activeQueryCacheBoardId = boardId;
};

export const getActiveQueryCacheBoardId = () => activeQueryCacheBoardId;

const persistableQueryPaths = new Set(["app.byId", "app.byIds", "docker.getContainers", "integration.byIds"]);
const excludedWidgetPaths = new Set(["widget.app.ping", "widget.beszel.getSystemStats"]);

const getTrpcPathFromQueryKey = (queryKey: QueryKey) => {
  const first = queryKey[0];
  if (!Array.isArray(first)) return null;

  const parts = first.filter((part): part is string => typeof part === "string");
  return parts.length > 0 ? parts : null;
};

export const isPersistableWidgetQueryKey = (queryKey: QueryKey) => {
  const path = getTrpcPathFromQueryKey(queryKey);
  if (!path) return false;

  if (path[0] === "widget") return !excludedWidgetPaths.has(path.join("."));

  return persistableQueryPaths.has(path.join("."));
};
