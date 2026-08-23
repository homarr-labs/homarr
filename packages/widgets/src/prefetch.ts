import type { QueryClient } from "@tanstack/react-query";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import type { WidgetKind } from "@homarr/definitions";
import { createSettings } from "@homarr/settings/creator";

import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";
import type { PrefetchLoader, WidgetOptionsRecordOf } from "./definition";
import type { inferOptionsFromCreator } from "./options";

const definePrefetchLoaders = <TLoaders extends Partial<{ [TKind in WidgetKind]: PrefetchLoader<TKind> }>>(
  loaders: TLoaders,
) => loaders;

// Keep these imports explicit so Next.js can trace each optional prefetch
// module without loading its database-specific implementation eagerly.
const prefetchLoaders = definePrefetchLoaders({
  app: () => import("./app/prefetch"),
  bookmarks: () => import("./bookmarks/prefetch"),
});

type PrefetchWidgetKind = keyof typeof prefetchLoaders;

const hasPrefetchLoader = (kind: WidgetKind): kind is PrefetchWidgetKind =>
  Object.prototype.hasOwnProperty.call(prefetchLoaders, kind);

export const prefetchForKindAsync = async <TKind extends WidgetKind>(
  kind: TKind,
  queryClient: QueryClient,
  items: {
    options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
    integrationIds: string[];
  }[],
) => {
  if (!hasPrefetchLoader(kind)) {
    return;
  }

  const [{ default: callback }, serverSettings, definition] = await Promise.all([
    prefetchLoaders[kind](),
    getRscServerSettingsAsync(),
    loadWidgetDefinition(kind),
  ]);

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
