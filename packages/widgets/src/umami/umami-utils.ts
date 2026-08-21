import type { useI18n } from "@homarr/translation/client";

import { timeFrameValues } from "./index";

export const umamiQueryOptions = { refetchInterval: 60_000 } as const;

export const EVENT_COLORS = ["blue.5", "orange.5", "green.5", "red.5", "violet.5", "teal.5", "yellow.5", "pink.5"];

export function formatXLabel(timestamp: string, timeFrame: string, locale: string): string {
  const date = new Date(timestamp);
  switch (timeFrame) {
    case "today":
    case "24h":
      return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    case "7d":
    case "30d":
    case "month":
    case "lastMonth":
      return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
    default:
      return timestamp;
  }
}

export type TimeFrame = (typeof timeFrameValues)[number];

export function formatTimeFrameLabel(timeFrame: TimeFrame, t: ReturnType<typeof useI18n<"widget.umami">>): string {
  if (timeFrameValues.includes(timeFrame)) {
    return t(`option.timeFrame.option.${timeFrame}`);
  }
  return timeFrame;
}
