"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const calculateTimeAgo = (timestamp: Date, locale: string) => {
  return dayjs().locale(locale).to(timestamp);
};

export const useTimeAgo = (timestamp: Date) => {
  const { locale } = useParams<{ locale: string }>();
  const [timeAgo, setTimeAgo] = useState(calculateTimeAgo(timestamp, locale));

  useEffect(() => {
    const intervalId = setInterval(() => setTimeAgo(calculateTimeAgo(timestamp, locale)), 1000); // update every second

    return () => clearInterval(intervalId); // clear interval on hook unmount
  }, [timestamp, locale]);

  return timeAgo;
};
