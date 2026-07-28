import { cache } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { db } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import type { WidgetKind } from "@homarr/definitions";
import { createSettings } from "@homarr/settings/creator";

import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";
import prefetchForApps from "./app/prefetch";
import prefetchForBookmarks from "./bookmarks/prefetch";
import prefetchForDownloads from "./downloads/prefetch";
import type { Prefetch, WidgetOptionsRecordOf } from "./definition";
import type { inferOptionsFromCreator } from "./options";

const cachedGetServerSettingsAsync = cache(getServerSettingsAsync);

const prefetchCallbacks: Partial<{
  [TKind in WidgetKind]: Prefetch<TKind>;
}> = {
  bookmarks: prefetchForBookmarks,
  app: prefetchForApps,
  downloads: prefetchForDownloads,
};

export const prefetchForKindAsync = async <TKind extends WidgetKind>(
  kind: TKind,
  queryClient: QueryClient,
  items: {
    options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
    integrationIds: string[];
  }[],
) => {
  const callback = prefetchCallbacks[kind];
  if (!callback) {
    return;
  }

  const serverSettings = await cachedGetServerSettingsAsync(db);
  const definition = await loadWidgetDefinition(kind);

  const itemsWithDefaultOptions = items.map((item) => ({
    ...item,
    options: reduceWidgetOptionsWithDefinition(
      definition,
      createSettings({ user: null, serverSettings }),
      item.options,
    ),
  }));

  await callback(queryClient, itemsWithDefaultOptions as never[]);
};
