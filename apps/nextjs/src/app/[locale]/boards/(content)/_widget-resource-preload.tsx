"use client";

import type { WidgetKind } from "@homarr/definitions";
import { loadWidgetResources } from "@homarr/widgets/manifest";

// This sibling can hydrate before pending widget data. Start only the visible
// board's retryable, deduplicated module imports without awaiting the results.
export const WidgetResourcePreload = ({ kinds }: { kinds: WidgetKind[] }) => {
  if (typeof window !== "undefined") {
    for (const kind of kinds) void loadWidgetResources(kind).catch(() => undefined);
  }
  return null;
};
