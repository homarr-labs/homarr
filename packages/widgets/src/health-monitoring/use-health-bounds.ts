"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useElementSize } from "@mantine/hooks";

/** ResizeObserver dimensions are logical on the board; layout decisions need visible pixels. */
export function useHealthBounds(scale = 1) {
  const { ref: observe, width, height } = useElementSize<HTMLDivElement>();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element;
      observe(element);
    },
    [observe],
  );
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const measure = () => {
      if (!element.isConnected) return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setBounds((current) => {
        if (Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1) return current;
        return { width: rect.width, height: rect.height };
      });
    };
    const onMotionEnd = (event: Event) => {
      if (event.target instanceof Element && event.target.contains(element)) measure();
    };
    measure();
    // Transforms change visible bounds without notifying ResizeObserver.
    document.addEventListener("animationend", onMotionEnd, true);
    document.addEventListener("transitionend", onMotionEnd, true);
    document.addEventListener("animationcancel", onMotionEnd, true);
    document.addEventListener("transitioncancel", onMotionEnd, true);
    return () => {
      document.removeEventListener("animationend", onMotionEnd, true);
      document.removeEventListener("transitionend", onMotionEnd, true);
      document.removeEventListener("animationcancel", onMotionEnd, true);
      document.removeEventListener("transitioncancel", onMotionEnd, true);
    };
  }, [width, height, scale]);
  return { ref, ...bounds };
}
