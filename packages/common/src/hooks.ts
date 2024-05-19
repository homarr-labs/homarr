"use client";
import { useEffect, useState } from "react";

const calculateTimeAgo = (timestamp: Date, locale: string) => {
  const relativeTime = new Intl.RelativeTimeFormat(locale, { style: "narrow" });
  const secondsAgo = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);

  if (secondsAgo < 60) {
    return "now";
  } else if (secondsAgo < 3600) {
    // less than an hour
    return relativeTime.format(-Math.floor(secondsAgo / 60), "minute");
  } else {
    // more than an hour
    return relativeTime.format(-Math.floor(secondsAgo / 3600), "hour");
  }
};

export const useTimeAgo = (timestamp: Date, locale: string) => {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (isNaN(timestamp.getTime())) {
      console.error(`Invalid timestamp: ${timestamp.toDateString()}`);
      return;
    }

    setTimeAgo(calculateTimeAgo(timestamp, locale));
    const intervalId = setInterval(() => setTimeAgo(calculateTimeAgo(timestamp, locale)), 1000); // update every second

    return () => clearInterval(intervalId); // clear interval on component unmount
  }, [timestamp, locale]);

  return timeAgo;
};
