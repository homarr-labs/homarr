import type { useScopedI18n } from "@homarr/translation/client";

export const EVENT_COLORS = ["blue.5", "orange.5", "green.5", "red.5", "violet.5", "teal.5", "yellow.5", "pink.5"];

export function formatXLabel(timestamp: string, timeFrame: string): string {
  const date = new Date(timestamp);
  switch (timeFrame) {
    case "today":
    case "24h":
      return `${date.getHours().toString().padStart(2, "0")}:00`;
    case "7d":
    case "30d":
    case "month":
    case "lastMonth":
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    default:
      return timestamp;
  }
}

const validTimeFrames = ["today", "24h", "7d", "30d", "month", "lastMonth"] as const;
type TimeFrame = (typeof validTimeFrames)[number];

export function formatTimeFrameLabel(timeFrame: string, t: ReturnType<typeof useScopedI18n<"widget.umami">>): string {
  if ((validTimeFrames as readonly string[]).includes(timeFrame)) {
    return t(`option.timeFrame.option.${timeFrame as TimeFrame}`);
  }
  return timeFrame;
}
