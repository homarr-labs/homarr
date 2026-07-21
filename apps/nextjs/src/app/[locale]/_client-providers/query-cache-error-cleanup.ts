import type { QueryClient } from "@tanstack/react-query";

import { isPersistableWidgetQueryKey } from "@homarr/api/query-cache";

export const createQueryCacheErrorCleanup = (queryClient: QueryClient): (() => void) => {
  const wasSuccessful = new Set<string>();

  return queryClient.getQueryCache().subscribe((event) => {
    const query = event.query;
    const key = query.queryHash;

    if (event.type === "removed") {
      wasSuccessful.delete(key);
      return;
    }

    if (event.type !== "updated") return;

    if (query.state.status === "success" && isPersistableWidgetQueryKey(query.queryKey)) {
      wasSuccessful.add(key);
      return;
    }

    if (query.state.status === "error" && wasSuccessful.has(key)) {
      queryClient.resetQueries({ queryKey: query.queryKey, exact: true });
      wasSuccessful.delete(key);
    }
  });
};
