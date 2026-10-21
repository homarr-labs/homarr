"use client";

import type { WidgetKind } from "@homarr/definitions";
import { loadWidgetResources } from "@homarr/widgets/manifest";
import { WidgetStyles } from "@homarr/widgets/widget-styles";

// Hydrating real cached content is part of Board restoration, including offscreen
// content. Browser-only placeholders can wait until they become visible.
export const WidgetResourcePreload = ({ kinds }: { kinds: WidgetKind[] }) => {
  if (typeof window !== "undefined") {
    const initialKinds = new Set<string>();
    for (const element of document.querySelectorAll<HTMLElement>("[data-grid-item-type='item'][data-kind]")) {
      if (!element.querySelector("[data-homarr-widget-client-only]")) {
        initialKinds.add(element.dataset.kind ?? "");
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      ) {
        initialKinds.add(element.dataset.kind ?? "");
      }
    }
    for (const kind of kinds) {
      if (initialKinds.has(kind)) void loadWidgetResources(kind).catch(() => undefined);
    }
  }
  return <WidgetStyles kinds={kinds} />;
};
