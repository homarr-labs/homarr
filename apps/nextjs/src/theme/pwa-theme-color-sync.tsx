"use client";

import { useEffect } from "react";

import { pwaPageBackground } from "./pwa-chrome";

const colorSchemeAttribute = "data-mantine-color-scheme";

const isResolvedScheme = (value: string | null): value is keyof typeof pwaPageBackground =>
  value === "light" || value === "dark";

/**
 * The theme-color tags are rendered on the server, so an in-app scheme switch would keep the old
 * window colour until the next load. Follows the scheme Mantine applies to the document instead.
 */
export const PwaThemeColorSync = () => {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const scheme = root.getAttribute(colorSchemeAttribute);
      if (!isResolvedScheme(scheme)) return;
      // Every variant gets the same colour, so a media variant cannot win over the app scheme.
      for (const meta of document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = pwaPageBackground[scheme];
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: [colorSchemeAttribute] });
    return () => observer.disconnect();
  }, []);

  return null;
};
