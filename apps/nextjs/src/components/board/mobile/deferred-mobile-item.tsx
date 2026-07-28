"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@mantine/core";

import classes from "./mobile-board.module.css";

interface DeferredMobileItemProps extends PropsWithChildren {
  eager: boolean;
  unmountWhenOffscreen: boolean;
}

export const mobilePreloadViewportMultiplier = 2;

export const getMobilePreloadRootMargin = (viewportHeight: number) =>
  `${Math.max(0, Math.round(viewportHeight * mobilePreloadViewportMultiplier))}px 0px`;

export const DeferredMobileItem = ({ eager, unmountWhenOffscreen, children }: DeferredMobileItemProps) => {
  const [hasMounted, setHasMounted] = useState(eager);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hasMountedOnceRef = useRef(eager);

  useEffect(() => {
    if (eager) {
      hasMountedOnceRef.current = true;
      setHasMounted(true);
      return;
    }

    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setHasMounted(true);
      return;
    }

    let observer: IntersectionObserver | null = null;
    const observe = () => {
      if (hasMountedOnceRef.current && !unmountWhenOffscreen) return;
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          const isNearViewport = entry?.isIntersecting ?? false;

          if (isNearViewport) {
            hasMountedOnceRef.current = true;
            setHasMounted(true);
            if (!unmountWhenOffscreen) observer?.disconnect();
            return;
          }

          if (unmountWhenOffscreen && !element.contains(document.activeElement)) {
            setHasMounted(false);
          }
        },
        { rootMargin: getMobilePreloadRootMargin(window.innerHeight) },
      );
      observer.observe(element);
    };

    observe();
    window.addEventListener("resize", observe);
    return () => {
      window.removeEventListener("resize", observe);
      observer?.disconnect();
    };
  }, [eager, unmountWhenOffscreen]);

  return (
    <div ref={wrapperRef} className={classes.deferredItem} aria-busy={!hasMounted}>
      {hasMounted ? children : <Skeleton h="100%" w="100%" radius="var(--mantine-radius-md)" aria-hidden />}
    </div>
  );
};
