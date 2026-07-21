import type { QueryClient } from "@tanstack/react-query";

import { isPersistableWidgetQueryKey } from "@homarr/api/query-cache";

export const removePersistedWidgetQueries = (queryClient: QueryClient) => {
  queryClient.removeQueries({ predicate: (query) => isPersistableWidgetQueryKey(query.queryKey) });
};
