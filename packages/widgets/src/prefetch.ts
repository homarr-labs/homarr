import type { QueryClient } from "@tanstack/react-query";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import type { WidgetKind } from "@homarr/definitions";
import { createSettings } from "@homarr/settings/creator";

import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";
import type { PrefetchLoader } from "./definition";

const definePrefetchLoaders = <TLoaders extends Partial<Record<WidgetKind, PrefetchLoader>>>(loaders: TLoaders) =>
  loaders;

// Keep these imports explicit so Next.js can trace each optional prefetch
// module without loading its database-specific implementation eagerly.
const prefetchLoaders = definePrefetchLoaders({
  app: () => import("./app/prefetch"),
  bookmarks: () => import("./bookmarks/prefetch"),
});

type PrefetchWidgetKind = keyof typeof prefetchLoaders;

const hasPrefetchLoader = (kind: WidgetKind): kind is PrefetchWidgetKind =>
  Object.prototype.hasOwnProperty.call(prefetchLoaders, kind);

export const prefetchForKindAsync = async (
  kind: WidgetKind,
  queryClient: QueryClient,
  items: {
    options: Record<string, unknown>;
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

  await callback(queryClient, itemsWithDefaultOptions);
};
