"use client";

import { useEffect, useState } from "react";
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
    // Only re-render when the rendered text actually changes. The label is coarse
    // ("3 minutes ago" holds for a whole minute) but the timer ticks every second,
    // so setting state unconditionally re-rendered the subtree ~60x/minute per
    // consumer for an identical string.
    const intervalId = setInterval(() => {
      const next = calculateTimeAgo(timestamp);
      setTimeAgo((previous) => (previous === next ? previous : next));
    }, updateFrequency);

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
