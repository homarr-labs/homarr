"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@mantine/core";

import classes from "./mobile-board.module.css";
import { observeMobileViewportProximity } from "./mobile-viewport-observer";

interface DeferredMobileItemProps extends PropsWithChildren {
  eager: boolean;
  unmountWhenOffscreen: boolean;
  onNearViewportChange?: (isNearViewport: boolean) => void;
}

export { getMobilePreloadRootMargin, mobilePreloadViewportMultiplier } from "./mobile-viewport-observer";

export const DeferredMobileItem = ({
  eager,
  unmountWhenOffscreen,
  onNearViewportChange,
  children,
}: DeferredMobileItemProps) => {
  const [hasMounted, setHasMounted] = useState(eager);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (eager) {
      setHasMounted(true);
      onNearViewportChange?.(true);
      return;
    }

    const element = wrapperRef.current;
    if (!element) {
      setHasMounted(true);
      onNearViewportChange?.(true);
      return;
    }

    return observeMobileViewportProximity(
      element,
      (isNearViewport) => {
        onNearViewportChange?.(isNearViewport);

        if (isNearViewport) {
          setHasMounted(true);
          return;
        }

        if (unmountWhenOffscreen && !element.contains(document.activeElement)) {
          setHasMounted(false);
        }
      },
      { once: !unmountWhenOffscreen },
    );
  }, [eager, onNearViewportChange, unmountWhenOffscreen]);

  return (
    <div ref={wrapperRef} className={classes.deferredItem} aria-busy={!hasMounted}>
      {hasMounted ? children : <Skeleton h="100%" w="100%" radius="var(--mantine-radius-md)" aria-hidden />}
    </div>
  );
};
