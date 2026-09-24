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

    function update() {
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
      const script = document.createElement("script");
      script.id = "_carbonads_js";
      script.async = true;
      script.src = "https://cdn.carbonads.com/carbon.js?serve=CWBDTKQM&placement=homarrdev&format=cover";
      host.appendChild(script);
    }

    update();
    desktop.addEventListener("change", update);
    return () => {
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
