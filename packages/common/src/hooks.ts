"use client";

import { createContext, useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const DayJsLocaleContext = createContext<string | null>(null);

export const useTimeAgo = (timestamp: Date, updateFrequency = 1000) => {
  const locale = useContext(DayJsLocaleContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => setTick((tick) => tick + 1), updateFrequency);

    return () => clearInterval(intervalId);
  }, [updateFrequency]);

  return dayjs()
    .locale(locale ?? dayjs.locale())
    .to(timestamp);
};

export const useIntegrationConnected = (updatedAt: Date, { timeout = 30000 }) => {
  const [connected, setConnected] = useState(Math.abs(dayjs(updatedAt).diff()) < timeout);

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
