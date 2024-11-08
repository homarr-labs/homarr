"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const calculateTimeAgo = (timestamp: Date) => {
  return dayjs().to(timestamp);
};

export const useTimeAgo = (timestamp: Date) => {
  const [timeAgo, setTimeAgo] = useState(calculateTimeAgo(timestamp));

  useEffect(() => {
    const intervalId = setInterval(() => setTimeAgo(calculateTimeAgo(timestamp)), 1000); // update every second

    return () => clearInterval(intervalId); // clear interval on hook unmount
  }, [timestamp]);

  return timeAgo;
};
