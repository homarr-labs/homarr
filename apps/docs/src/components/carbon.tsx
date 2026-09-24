"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Placement = "toc" | "inline" | "banner";

/** Responsive placements are mutually exclusive: never request a hidden ad. */
export function Carbon({ placement = "banner" }: { placement?: Placement }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const host = ref.current;
    if (!host || pathname === "/") return;
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_CARBON_ADS !== "true") return;
    const desktop = window.matchMedia("(min-width: 1280px)");

    let pendingLoad: ReturnType<typeof setTimeout> | undefined;
    // Carbon responses can outlive the script that requested them. Keep the newest
    // creative if an earlier navigation or breakpoint request finishes late.
    const observer = new MutationObserver(() => {
      const creatives = host.querySelectorAll('[id="carbonads"]');
      for (const creative of Array.from(creatives).slice(0, -1)) creative.remove();
    });
    observer.observe(host, { childList: true, subtree: true });

    function update() {
      clearTimeout(pendingLoad);
      if (!host) return;
      const visible =
        placement === "banner" ||
        (placement === "toc" && desktop.matches) ||
        (placement === "inline" && !desktop.matches);
      if (!visible) {
        host.replaceChildren();
        return;
      }
      if (host.querySelector("script")) return;
      // Defer until after effect cleanup, avoiding duplicate requests during
      // React Strict Mode's setup/cleanup/setup cycle.
      pendingLoad = setTimeout(() => {
        if (!host.isConnected || host.querySelector("script")) return;
        const script = document.createElement("script");
        script.id = "_carbonads_js";
        script.async = true;
        script.src = "https://cdn.carbonads.com/carbon.js?serve=CWBDTKQM&placement=homarrdev&format=cover";
        host.appendChild(script);
      }, 0);
    }

    update();
    desktop.addEventListener("change", update);
    return () => {
      clearTimeout(pendingLoad);
      observer.disconnect();
      desktop.removeEventListener("change", update);
      host.replaceChildren();
    };
  }, [pathname, placement]);

  if (pathname === "/") return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`homarr-carbon homarr-carbon-${placement}`}
      data-visual-test="blackout"
    >
      <div ref={ref} />
    </aside>
  );
}
