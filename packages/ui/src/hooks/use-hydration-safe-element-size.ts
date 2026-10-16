import { startTransition, useCallback, useState } from "react";

export type ElementSizeBox = "content-box" | "border-box";

export interface HydrationSafeElementSizeOptions {
  box?: ElementSizeBox;
}

const readLength = (computed: CSSStyleDeclaration, property: string) => {
  const parsed = Number.parseFloat(computed.getPropertyValue(property));
  return Number.isFinite(parsed) ? parsed : null;
};

const readBorderBoxSize = (entry: ResizeObserverEntry, element: HTMLElement) => {
  const box = entry.borderBoxSize;
  const size = Array.isArray(box) ? box[0] : box;
  if (size) return { width: size.inlineSize, height: size.blockSize };

  const view = element.ownerDocument.defaultView;
  const computed = view?.getComputedStyle(element);
  if (!computed) return null;

  const paddingLeft = readLength(computed, "padding-left");
  const paddingRight = readLength(computed, "padding-right");
  const paddingTop = readLength(computed, "padding-top");
  const paddingBottom = readLength(computed, "padding-bottom");
  const borderLeft = readLength(computed, "border-left-width");
  const borderRight = readLength(computed, "border-right-width");
  const borderTop = readLength(computed, "border-top-width");
  const borderBottom = readLength(computed, "border-bottom-width");
  if (
    paddingLeft === null ||
    paddingRight === null ||
    paddingTop === null ||
    paddingBottom === null ||
    borderLeft === null ||
    borderRight === null ||
    borderTop === null ||
    borderBottom === null
  ) {
    return null;
  }

  return {
    width: entry.contentRect.width + paddingLeft + paddingRight + borderLeft + borderRight,
    height: entry.contentRect.height + paddingTop + paddingBottom + borderTop + borderBottom,
  };
};

/**
 * Measures an element like Mantine's useElementSize, but applies each size as
 * a Transition. A Widget's Suspense boundary may still be hydrating when the
 * first size arrives; an urgent update would make React discard its server HTML
 * and show the pending card, while a Transition waits for hydration instead.
 */
export const useHydrationSafeElementSize = <TElement extends HTMLElement>(
  options: HydrationSafeElementSizeOptions = {},
) => {
  const box = options.box ?? "content-box";
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback(
    (element: TElement | null) => {
      if (!element) return;
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;
        const next =
          box === "border-box"
            ? readBorderBoxSize(entry, element)
            : { width: entry.contentRect.width, height: entry.contentRect.height };
        if (!next) return;
        startTransition(() =>
          setSize((current) => {
            if (current.width === next.width && current.height === next.height) return current;
            return next;
          }),
        );
      });
      observer.observe(element, { box });
      return () => observer.disconnect();
    },
    [box],
  );
  return { ref, width: size.width, height: size.height };
};
