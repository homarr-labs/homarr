"use client";

import { useEffect } from "react";

import { initAnalytics, track } from "@/lib/analytics";

export function Analytics() {
  useEffect(() => {
    initAnalytics();

    function onClick(event: MouseEvent) {
      if (event.button !== 0 && event.button !== 1) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[data-attr="Install button"][href]');
      if (!link || link.closest(".homarr-carbon")) return;
      const url = new URL(link.href, window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      track("Installation Opened", { destination: `${url.origin}${url.pathname}` });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}
