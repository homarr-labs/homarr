import { startTransition, useCallback, useState } from "react";

/**
 * Measures an element like Mantine's useElementSize, but applies each size as
 * a Transition. A Widget's Suspense boundary may still be hydrating when the
 * first size arrives; an urgent update would make React discard its server HTML
 * and show the pending card, while a Transition waits for hydration instead.
 */
export const useHydrationSafeElementSize = <TElement extends HTMLElement>() => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((element: TElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      startTransition(() =>
        setSize((current) => {
          if (current.width === width && current.height === height) return current;
          return { width, height };
        }),
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width: size.width, height: size.height };
};
