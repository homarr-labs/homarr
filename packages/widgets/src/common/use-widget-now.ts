"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWidgetInitialTimestamp } from "./widget-time-context";

export type WidgetClockPrecision = "second" | "minute" | "day";

const minimumDelayMs = 10;

export const getNextWidgetTickDelay = (now: Date, precision: WidgetClockPrecision): number => {
  let next: number;
  if (precision === "second") {
    next = now.getTime() - now.getMilliseconds() + 1_000;
  } else if (precision === "minute") {
    next = now.getTime() - now.getSeconds() * 1_000 - now.getMilliseconds() + 60_000;
  } else {
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  }

  return Math.max(minimumDelayMs, next - now.getTime());
};

export const useWidgetNow = (precision: WidgetClockPrecision = "minute"): Date | null => {
  const initialTimestamp = useWidgetInitialTimestamp();
  const [now, setNow] = useState<Date | null>(() => (initialTimestamp === null ? null : new Date(initialTimestamp)));
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelTick = useCallback(() => {
    if (timeoutRef.current === undefined) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  const scheduleTick = useCallback(() => {
    cancelTick();
    const current = new Date();
    setNow(current);
    timeoutRef.current = setTimeout(scheduleTick, getNextWidgetTickDelay(current, precision));
  }, [cancelTick, precision]);

  useEffect(() => {
    scheduleTick();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleTick();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelTick();
    };
  }, [cancelTick, scheduleTick]);

  return now;
};
