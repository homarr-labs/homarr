"use client";

import { useEffect, useState } from "react";

import { useAddInPlaceSession } from "./store";

const areaSelector = "[data-add-in-place-area]";

const sameRect = (a: DOMRect | null, b: DOMRect | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
};

export const useAreaAnchorRect = () => {
  const session = useAddInPlaceSession();
  const active = session !== null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    let frame = 0;
    const tick = () => {
      const element = document.querySelector(areaSelector);
      const next = element ? element.getBoundingClientRect() : null;
      setRect((previous) => (sameRect(previous, next) ? previous : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return rect;
};
