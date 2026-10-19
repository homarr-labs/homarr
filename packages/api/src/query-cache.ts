import type { QueryKey } from "@tanstack/react-query";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

interface ForbiddenRpcError {
  code: "FORBIDDEN";
}

export const isRpcForbiddenError = (error: unknown): error is ForbiddenRpcError => {
  if (!isRecord(error)) return false;
  return error.code === "FORBIDDEN";
};

// RSC-prefetched data must survive the hydration pass without an immediate
// duplicate fetch. Widget-specific intervals still control live refreshes.
export const queryCacheDefaultStaleTimeMs = 30_000;
export const queryCacheDefaultRefetchIntervalMs = 30_000;
export const queryCacheDefaultGcTimeMs = 1000 * 60 * 5;
export const queryCacheMetadataStaleTimeMs = 1000 * 60 * 5;

const widgetDataQueryPaths = new Set(["app.byId", "app.byIds", "docker.getContainers", "integration.byIds"]);
// Beszel system stats come from a live subscription rather than ordinary query recovery.
const excludedWidgetPaths = new Set(["widget.app.ping", "widget.beszel.getSystemStats"]);

export const isWidgetDataRpcPath = (path: string) => {
  if (path.startsWith("widget.")) return !excludedWidgetPaths.has(path);
  return widgetDataQueryPaths.has(path);
};

// These supporting queries can be numerous on a dashboard. Give them a
// predictable refresh policy instead of refetching all of them after every tab
// focus/reconnect event. Metadata can refresh after a bounded stale window;
// Docker state remains live on a single shared timer.
export const dashboardSupportingQueryPolicies = [
  {
    queryKey: [["app", "byId"]],
    refetchInterval: false,
    staleTime: queryCacheMetadataStaleTimeMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  {
    queryKey: [["app", "byIds"]],
    refetchInterval: false,
    staleTime: queryCacheMetadataStaleTimeMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  {
    queryKey: [["integration", "byIds"]],
    refetchInterval: false,
    staleTime: queryCacheMetadataStaleTimeMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  {
    queryKey: [["docker", "getContainers"]],
    refetchInterval: queryCacheDefaultRefetchIntervalMs,
    staleTime: queryCacheDefaultStaleTimeMs,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
] as const;

const getRpcPathFromQueryKey = (queryKey: QueryKey) => {
  const first = queryKey[0];
  if (!Array.isArray(first)) return null;

  const parts = first.filter((part): part is string => typeof part === "string");
  return parts.length > 0 ? parts : null;
};

export const isWidgetDataQueryKey = (queryKey: QueryKey) => {
  const path = getRpcPathFromQueryKey(queryKey);
  if (!path) return false;

  return isWidgetDataRpcPath(path.join("."));
};
