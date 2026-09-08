"use client";

import { useCallback, useState } from "react";

/** Canvas fitting uses the scrollport, not the border box including native scrollbars. */
export const useCanvasViewportSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => setSize({ width: node.clientWidth, height: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
};
