import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import type { OptionTimezone } from "../options";

dayjs.extend(utc);
dayjs.extend(timezone);

export const maximumWorldClockCities = 6;

export const worldClockCityPresets = [
  { id: "new-york", label: "New York", timeZone: "America/New_York" },
  { id: "london", label: "London", timeZone: "Europe/London" },
  { id: "paris", label: "Paris", timeZone: "Europe/Paris" },
  { id: "tokyo", label: "Tokyo", timeZone: "Asia/Tokyo" },
  { id: "sydney", label: "Sydney", timeZone: "Australia/Sydney" },
  { id: "utc", label: "UTC", timeZone: "UTC" },
] as const satisfies readonly OptionTimezone[];

export const defaultWorldClockCities = worldClockCityPresets.filter(({ id }) =>
  ["new-york", "paris", "tokyo"].includes(id),
);

export const getTimeZoneOptions = () => {
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes("UTC")) timeZones.push("UTC");

  return timeZones.map((timeZone) => ({
    value: timeZone,
    label: `${humanizeTimeZone(timeZone)} (${timeZone})`,
  }));
};

export const humanizeTimeZone = (timeZone: string) => {
  if (timeZone === "UTC") return "UTC";
  const segments = timeZone.split("/");
  return (segments.at(-1) ?? timeZone).replaceAll("_", " ");
};

export const isTimeZoneSupported = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
};

export type TimeOfDayPhase = "night" | "dawn" | "day" | "dusk";

export interface WorldClockTime {
  id: string;
  label: string;
  timeZone: string;
  zonedTime: Dayjs | null;
  phase: TimeOfDayPhase | null;
  minuteOfDay: number | null;
  utcOffset: number | null;
  dayDifference: number | null;
}

export const getResolvedLocalTimeZone = () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone && isTimeZoneSupported(timeZone) ? timeZone : "UTC";
};

export const createWorldClockTime = ({
  city,
  now,
  primaryTime,
}: {
  city: OptionTimezone;
  now: Date;
  primaryTime: Dayjs;
}): WorldClockTime => {
  if (!isTimeZoneSupported(city.timeZone)) {
    return {
      ...city,
      zonedTime: null,
      phase: null,
      minuteOfDay: null,
      utcOffset: null,
      dayDifference: null,
    };
  }

  const zonedTime = dayjs(now).tz(city.timeZone);
  return {
    ...city,
    zonedTime,
    phase: getTimeOfDayPhase(zonedTime.hour()),
    minuteOfDay: zonedTime.hour() * 60 + zonedTime.minute() + zonedTime.second() / 60,
    utcOffset: zonedTime.utcOffset(),
    dayDifference: getCivilDayNumber(zonedTime) - getCivilDayNumber(primaryTime),
  };
};

export const getTimeOfDayPhase = (hour: number): TimeOfDayPhase => {
  if (hour < 5 || hour >= 21) return "night";
  if (hour < 8) return "dawn";
  if (hour < 18) return "day";
  return "dusk";
};

export const formatUtcOffset = (minutes: number) => {
  if (minutes === 0) return "UTC±00:00";
  const sign = minutes < 0 ? "−" : "+";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, "0");
  const remainingMinutes = (absoluteMinutes % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${remainingMinutes}`;
};

export const formatRelativeOffset = (minutes: number) => {
  if (minutes === 0) return "±0h";
  const sign = minutes < 0 ? "−" : "+";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  return remainingMinutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${remainingMinutes}m`;
};

const getCivilDayNumber = (value: Dayjs) => Date.UTC(value.year(), value.month(), value.date()) / 86_400_000;
