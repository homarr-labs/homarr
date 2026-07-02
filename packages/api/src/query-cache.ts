import type { QueryKey } from "@tanstack/react-query";

export const queryCacheDefaultStaleTimeMs = 0;
export const queryCacheDefaultRefetchIntervalMs = 30_000;
export const queryCacheDefaultGcTimeMs = 1000 * 60 * 60 * 24;
export const queryCacheMaxValueBytes = 1024 * 1024;
export const queryCacheStoragePrefix = "homarr-widget-query";

let activeQueryCacheBoardId: string | null = null;

export const setActiveQueryCacheBoardId = (boardId: string | null) => {
  activeQueryCacheBoardId = boardId;
};

export const getActiveQueryCacheBoardId = () => activeQueryCacheBoardId;

const persistableQueryPaths = new Set(["app.byId", "app.byIds", "docker.getContainers", "integration.byIds"]);
const excludedWidgetPaths = new Set(["widget.app.ping"]);

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
