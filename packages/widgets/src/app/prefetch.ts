import type { QueryClient } from "@tanstack/react-query";

import { rpc } from "@homarr/api/server";

const prefetchAll = (queryClient: QueryClient, items: { options: Record<string, unknown> }[]) => {
  const appIds = new Set<string>();
  for (const item of items) {
    if (typeof item.options.appId === "string" && item.options.appId.length > 0) appIds.add(item.options.appId);
  }
  for (const id of appIds) void queryClient.prefetchQuery(rpc.app.byId.queryOptions({ id }));
};

export default prefetchAll;
