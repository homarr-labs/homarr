import type { QueryClient } from "@tanstack/react-query";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import type { WidgetKind } from "@homarr/definitions";
import { createSettings } from "@homarr/settings/creator";

import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";
import prefetchForApps from "./app/prefetch";
import prefetchForBookmarks from "./bookmarks/prefetch";
import type { Prefetch, WidgetOptionsRecordOf } from "./definition";
import type { inferOptionsFromCreator } from "./options";

const prefetchCallbacks: Partial<{
  [TKind in WidgetKind]: Prefetch<TKind>;
}> = {
  bookmarks: prefetchForBookmarks,
  app: prefetchForApps,
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

  const [serverSettings, definition] = await Promise.all([getRscServerSettingsAsync(), loadWidgetDefinition(kind)]);

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
