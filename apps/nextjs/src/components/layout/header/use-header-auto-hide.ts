"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_HIDE_THRESHOLD = 24;
const SCROLL_DIRECTION_HYSTERESIS = 6;

export const useHeaderAutoHide = (enabled: boolean) => {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setIsHidden(false);
      return;
    }

    lastScrollYRef.current = window.scrollY;
    let frame: number | null = null;

    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        if (currentY <= SCROLL_HIDE_THRESHOLD) {
          setIsHidden(false);
        } else if (delta > SCROLL_DIRECTION_HYSTERESIS) {
          setIsHidden(true);
        } else if (delta < -SCROLL_DIRECTION_HYSTERESIS) {
          setIsHidden(false);
        }

        lastScrollYRef.current = currentY;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return enabled && isHidden;
};
