import type { DehydratedState } from "@tanstack/react-query";
import { isTrpcForbiddenError } from "@homarr/api/query-cache";

import { dehydrate, hydrate, QueryCache, QueryClient } from "@tanstack/react-query";

const noop = () => undefined;

/** Keep SSR query values available while individual Widget boundaries hydrate. */
export const createQueryHydrationSnapshot = (sharedClient: QueryClient) => {
  const snapshotCache = new QueryCache();
  const buildQuery = snapshotCache.build.bind(snapshotCache);
  snapshotCache.build = (client, options, state) => buildQuery(client, { ...options, gcTime: Infinity }, state);
  const snapshotClient = new QueryClient({
    queryCache: snapshotCache,
    defaultOptions: sharedClient.getDefaultOptions(),
  });
  let initialState: DehydratedState | undefined = dehydrate(sharedClient, {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) => query.state.data !== undefined && !isTrpcForbiddenError(query.state.error),
  });
  hydrate(snapshotClient, initialState);
  const denied = new Set<string>();
  let disposed = false;
  let unsubscribe: () => void = noop;
  if (typeof window !== "undefined") {
    unsubscribe = sharedClient.getQueryCache().subscribe((event) => {
      if (isTrpcForbiddenError(event.query.state.error)) {
        denied.add(event.query.queryHash);
        const query = snapshotCache.get(event.query.queryHash);
        if (query) snapshotCache.remove(query);
      }
    });
  }

  return {
    dispose: () => {
      disposed = true;
      unsubscribe();
      snapshotClient.clear();
      initialState = undefined;
    },
    createClient: () => {
      let resumed = false;
      const cache = new Proxy(snapshotCache, {
        get(_target, property) {
          let current = snapshotCache;
          // Cache subscriptions follow live updates even while initial reads are frozen.
          if (disposed || resumed || property === "subscribe") current = sharedClient.getQueryCache();
          const value = Reflect.get(current, property, current);
          if (typeof value === "function") return value.bind(current);
          return value;
        },
      });
      const client = new QueryClient({
        queryCache: cache,
        mutationCache: sharedClient.getMutationCache(),
        defaultOptions: sharedClient.getDefaultOptions(),
      });
      client.defaultQueryOptions = sharedClient.defaultQueryOptions.bind(sharedClient);
      client.defaultMutationOptions = sharedClient.defaultMutationOptions.bind(sharedClient);
      client.getQueryDefaults = sharedClient.getQueryDefaults.bind(sharedClient);
      client.getMutationDefaults = sharedClient.getMutationDefaults.bind(sharedClient);
      client.getDefaultOptions = sharedClient.getDefaultOptions.bind(sharedClient);
      client.setQueryDefaults = sharedClient.setQueryDefaults.bind(sharedClient);
      client.setMutationDefaults = sharedClient.setMutationDefaults.bind(sharedClient);
      client.setDefaultOptions = sharedClient.setDefaultOptions.bind(sharedClient);
      // The shared provider alone owns focus/online subscriptions and their lifecycle.
      client.mount = noop;
      client.unmount = noop;
      return {
        client,
        resume: () => {
          // Unobserved live queries may have been collected while this Widget waited.
          // Seed only missing entries; never overwrite fresh results or revive denied data.
          if (initialState) {
            const queries = initialState.queries.filter(
              (query) => !denied.has(query.queryHash) && !sharedClient.getQueryCache().get(query.queryHash),
            );
            hydrate(sharedClient, { queries, mutations: [] });
          }
          resumed = true;
        },
      };
    },
  };
};
