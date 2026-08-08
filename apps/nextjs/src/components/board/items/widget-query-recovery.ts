import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const removeWidgetDataQueries = (queryClient: QueryClient, queryKeys: QueryKey[]) => {
  queryKeys.forEach((queryKey) => queryClient.removeQueries({ queryKey }));
};
