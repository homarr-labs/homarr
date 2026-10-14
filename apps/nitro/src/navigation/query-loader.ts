import type { QueryOptionsOut } from "@orpc/tanstack-query";
import type { DataTag, QueryClient, QueryKey } from "@tanstack/react-query";

import { waitForNavigationScope } from "./scope";

export type FiniteRouteQueryPolicy =
  | { readonly freshness: "cache-acceptable"; readonly revalidateIfStale: boolean }
  | { readonly freshness: "fetch" };

export function createRouteQueryLoader(queryClient: QueryClient) {
  return {
    loadFiniteQuery<TData, TError, TSelected = TData>(
      options: QueryOptionsOut<TData, TError, TSelected, undefined>,
      policy: FiniteRouteQueryPolicy,
      signal: AbortSignal,
    ): Promise<TData> {
      return waitForNavigationScope(signal, () => {
        if (policy.freshness === "fetch") {
          return queryClient.fetchQuery<TData, TError, TData, DataTag<QueryKey, TData, TError>>({
            ...options,
            staleTime: 0,
          });
        }

        return queryClient.ensureQueryData<TData, TError, TData, DataTag<QueryKey, TData, TError>>({
          ...options,
          revalidateIfStale: policy.revalidateIfStale,
        });
      });
    },
    prefetchFiniteQuery<TData, TError, TSelected = TData>(
      options: QueryOptionsOut<TData, TError, TSelected, undefined>,
    ): Promise<void> {
      return queryClient.prefetchQuery<TData, TError, TData, DataTag<QueryKey, TData, TError>>(options);
    },
  };
}
