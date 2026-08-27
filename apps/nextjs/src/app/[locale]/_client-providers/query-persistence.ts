import type { QueryKey } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";

import { isWidgetDataQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceBuster = "v5-dashboard-data";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache";

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${encodeURIComponent(scope ?? "anonymous")}`;

interface PersistableQuery {
  queryKey: QueryKey;
  state: { data: unknown; status: string };
}

export const shouldPersistDashboardQuery = (query: PersistableQuery) =>
  query.state.data !== undefined && isWidgetDataQueryKey(query.queryKey);

const getSessionStorage = () => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export type SessionQueryPersistence = PersistQueryClientProviderProps["persistOptions"];

export const createSessionQueryPersistence = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersistence => ({
  persister: createSyncStoragePersister({
    storage,
    key: getQueryPersistenceStorageKey(scope),
    serialize: stringify,
    deserialize: parse,
    retry: removeOldestQuery,
  }),
  maxAge: queryCacheDefaultGcTimeMs,
  buster: queryPersistenceBuster,
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: shouldPersistDashboardQuery,
  },
});
