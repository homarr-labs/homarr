import type { QueryClient } from "@tanstack/react-query";

import { rpc } from "@homarr/api/server";

import { getDirectBookmarkUrl } from "./bookmark-item";

const prefetchAll = (queryClient: QueryClient, items: { options: Record<string, unknown> }[]) => {
  for (const item of items) {
    if (!Array.isArray(item.options.items)) continue;
    const appIds = item.options.items.filter(
      (value): value is string => typeof value === "string" && !getDirectBookmarkUrl(value),
    );
    if (appIds.length > 0) void queryClient.prefetchQuery(rpc.app.byIds.queryOptions(appIds));
  }
};

export default prefetchAll;
