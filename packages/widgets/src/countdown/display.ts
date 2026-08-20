import type { CountdownEventState } from "./recurrence";

const secondMs = 1_000;
const minuteMs = 60 * secondMs;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export interface CountdownDurationPart {
  unit: Intl.NumberFormatOptions["unit"];
  value: number;
}

export const getCountdownDurationParts = (
  state: CountdownEventState,
  now: Date,
  showSeconds: boolean,
): CountdownDurationPart[] => {
  const occurrence = state.nextOccurrence;
  if (!occurrence) return [];
  const remaining = Math.max(0, occurrence.getTime() - now.getTime());
  const days = Math.floor(remaining / dayMs);
  const hours = Math.floor((remaining % dayMs) / hourMs);
  const minutes = Math.floor((remaining % hourMs) / minuteMs);
  const seconds = Math.floor((remaining % minuteMs) / secondMs);

  if (showSeconds) {
    const parts: CountdownDurationPart[] = [];
    if (days > 0) parts.push({ unit: "day", value: days });
    if (days > 0 || hours > 0) parts.push({ unit: "hour", value: hours });
    if (days > 0 || hours > 0 || minutes > 0) parts.push({ unit: "minute", value: minutes });
    parts.push({ unit: "second", value: seconds });
    return parts;
  }

  if (days > 0)
    return compactParts([
      { unit: "day", value: days },
      { unit: "hour", value: hours },
    ]);
  if (hours > 0)
    return compactParts([
      { unit: "hour", value: hours },
      { unit: "minute", value: minutes },
    ]);
  if (minutes > 0) return [{ unit: "minute", value: minutes }];
  return [{ unit: "minute", value: 0 }];
};

const compactParts = (parts: CountdownDurationPart[]) => {
  const nonZero = parts.filter(({ value }) => value > 0);
  return nonZero.length > 0 ? nonZero : parts.slice(0, 1);
};

export const formatCountdownDuration = (
  state: CountdownEventState,
  now: Date,
  showSeconds: boolean,
  locale: string,
  unitDisplay: Intl.NumberFormatOptions["unitDisplay"] = "short",
) => {
  return getCountdownDurationParts(state, now, showSeconds)
    .map(({ unit, value }) => new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay }).format(value))
    .join(" ");
};
