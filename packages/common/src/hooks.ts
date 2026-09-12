"use client";

import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const calculateTimeAgo = (timestamp: Date) => {
  return dayjs().to(timestamp);
};

export const useTimeAgo = (timestamp: Date, updateFrequency = 1000) => {
  const [timeAgo, setTimeAgo] = useState(() => calculateTimeAgo(timestamp));

  useEffect(() => {
    setTimeAgo(calculateTimeAgo(timestamp));
  }, [timestamp]);

  useEffect(() => {
    const intervalId = setInterval(() => setTimeAgo(calculateTimeAgo(timestamp)), updateFrequency);

    return () => clearInterval(intervalId); // clear interval on hook unmount
  }, [timestamp, updateFrequency]);

  return timeAgo;
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

/** Track overlapping preparations without allowing one completion to clear another's pending state. */
export function usePendingOperations() {
  const [count, setCount] = useState(0);
  const trackPending = useCallback((pending: boolean) => {
    setCount((current) => {
      if (pending) return current + 1;
      return current - 1;
    });
  }, []);
  return [count > 0, trackPending] as const;
}
