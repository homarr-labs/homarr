import { startTransition, useCallback, useState } from "react";

// Measuring a mounted board should not interrupt hydration of its widgets.
export const useDeferredElementSize = <TElement extends HTMLElement>() => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((element: TElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      startTransition(() => {
        setSize((current) => {
          if (current.width === width && current.height === height) return current;
          return { width, height };
        });
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
};
