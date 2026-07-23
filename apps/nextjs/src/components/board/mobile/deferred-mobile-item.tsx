"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@mantine/core";

import classes from "./mobile-board.module.css";

interface DeferredMobileItemProps extends PropsWithChildren {
  eager: boolean;
}

export const DeferredMobileItem = ({ eager, children }: DeferredMobileItemProps) => {
  const [hasMounted, setHasMounted] = useState(eager);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (eager || hasMounted) return;

    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setHasMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setHasMounted(true);
        observer.disconnect();
      },
      { rootMargin: "200% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, hasMounted]);

  return (
    <div ref={wrapperRef} className={classes.deferredItem} aria-busy={!hasMounted}>
      {hasMounted ? children : <Skeleton h="100%" w="100%" radius="var(--mantine-radius-md)" aria-hidden />}
    </div>
  );
};
