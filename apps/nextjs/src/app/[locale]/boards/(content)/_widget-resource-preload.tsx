"use client";

import type { WidgetKind } from "@homarr/definitions";
import { loadWidgetResources } from "@homarr/widgets/manifest";
import { WidgetStyles } from "@homarr/widgets/widget-styles";

// This sibling can hydrate before pending widget data. Start only the visible
// board's retryable, deduplicated module imports without awaiting the results.
export const WidgetResourcePreload = ({ kinds }: { kinds: WidgetKind[] }) => {
  if (typeof window !== "undefined") {
    const visibleKinds = new Set<string>();
    for (const element of document.querySelectorAll<HTMLElement>("[data-grid-item-type='item'][data-kind]")) {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      ) {
        visibleKinds.add(element.dataset.kind ?? "");
      }
    }
    for (const kind of kinds) {
      if (visibleKinds.has(kind)) void loadWidgetResources(kind).catch(() => undefined);
    }
  }
  return <WidgetStyles kinds={kinds} />;
};
