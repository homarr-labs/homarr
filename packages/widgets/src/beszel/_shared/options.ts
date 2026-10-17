import type { BeszelMetricOptionKey, BeszelTimePeriod } from "@homarr/definitions/beszel";
import { beszelMetricOptionKeys, beszelTimePeriods } from "@homarr/definitions/beszel";

import type { WidgetOptionOfType } from "../../options";

const periodLabels = {
  "1m": { label: "Live", compactLabel: "Live", translationKey: "period.live" },
  "1h": { label: "1 Hour", compactLabel: "1H", translationKey: "period.oneHour" },
  "12h": { label: "12 Hours", compactLabel: "12H", translationKey: "period.twelveHours" },
  "24h": { label: "24 Hours", compactLabel: "24H", translationKey: "period.oneDay" },
  "1w": { label: "1 Week", compactLabel: "1W", translationKey: "period.oneWeek" },
  "30d": { label: "30 Days", compactLabel: "30D", translationKey: "period.thirtyDays" },
} as const satisfies Record<BeszelTimePeriod, { label: string; compactLabel: string; translationKey: string }>;

export const beszelTimePeriodOptions = beszelTimePeriods.map((value) => ({ value, label: periodLabels[value].label }));

export const beszelCompactTimePeriodOptions = beszelTimePeriods.map((value) => ({
  value,
  label: periodLabels[value].compactLabel,
}));

export const getLocalizedBeszelTimePeriodOptions = (
  translate: (key: (typeof periodLabels)[BeszelTimePeriod]["translationKey"]) => string,
) => beszelTimePeriods.map((value) => ({ value, label: translate(periodLabels[value].translationKey) }));

export const createBeszelMetricOptions = (createSwitch: () => WidgetOptionOfType<"switch">) =>
  Object.fromEntries(beszelMetricOptionKeys.map((key) => [key, createSwitch()])) as Record<
    BeszelMetricOptionKey,
    WidgetOptionOfType<"switch">
  >;

export const statusOptions = [
  { value: "all", label: "All Systems" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
  { value: "paused", label: "Paused" },
];
