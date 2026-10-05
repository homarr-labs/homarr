import type { QueryClient } from "@tanstack/react-query";

import type { WidgetKind } from "@homarr/definitions";

import prefetchApps from "./app/prefetch";
import prefetchBookmarks from "./bookmarks/prefetch";

type PrefetchItem = {
  options: Record<string, unknown>;
};

// Register pending queries before dehydrating the board. Their results can then
// cross the RSC boundary without waiting for the database read to finish.
export const prefetchForKind = (kind: WidgetKind, queryClient: QueryClient, items: PrefetchItem[]) => {
  if (kind === "app") prefetchApps(queryClient, items);
  if (kind === "bookmarks") prefetchBookmarks(queryClient, items);
};
