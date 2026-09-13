import { useEffect, useRef } from "react";

/** Board authorization and the mounted placement still determine which links can open a surface. */
export function useWidgetAdvancedDeepLink(itemId: string, enabled: boolean, open: () => void) {
  const callback = useRef(open);
  callback.current = open;
  useEffect(() => {
    if (!enabled) return;
    let frame: number | undefined;
    const inspect = () => {
      const target = new URLSearchParams(window.location.hash.slice(1)).get("widget");
      if (target !== itemId) return;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => callback.current());
    };
    inspect();
    window.addEventListener("hashchange", inspect);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", inspect);
    };
  }, [enabled, itemId]);
}
