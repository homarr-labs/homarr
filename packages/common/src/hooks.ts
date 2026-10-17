"use client";

import { createContext, useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useHydrationTime } from "./initial-render-time";

dayjs.extend(relativeTime);

export const DayJsLocaleContext = createContext<string | null>(null);

export const useTimeAgo = (timestamp: Date, updateFrequency = 1000) => {
  const locale = useContext(DayJsLocaleContext);
  const initialTime = useHydrationTime();
  const [, setTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => setTick((tick) => tick + 1), updateFrequency);

    return () => clearInterval(intervalId);
  }, [updateFrequency]);

  return dayjs(initialTime)
    .locale(locale ?? dayjs.locale())
    .to(timestamp);
};

export const useIntegrationConnected = (updatedAt: Date, { timeout = 30000 }) => {
  const initialTime = useHydrationTime();
  const [connected, setConnected] = useState(Math.abs(dayjs(updatedAt).diff(dayjs(initialTime))) < timeout);

  useEffect(() => {
    setConnected(Math.abs(dayjs(updatedAt).diff()) < timeout);

    const delayUntilTimeout = timeout - Math.abs(dayjs(updatedAt).diff());
    const timeoutRef = setTimeout(() => {
      setConnected(false);
    }, delayUntilTimeout);

    return () => clearTimeout(timeoutRef);
  }, [updatedAt, timeout]);

  return connected;
};
