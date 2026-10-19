import dayjs from "dayjs";
import type { UnitTypeShort } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(isBetween);
dayjs.extend(relativeTime);
dayjs.extend(utc);

const validUnits = ["h", "d", "w", "M", "y"] as UnitTypeShort[];

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Keep durations independent of the current date and local daylight-saving transitions.
const durationReference = dayjs.utc(0);

export function formatHumanizedDuration(milliseconds: number): string {
  return durationReference.add(milliseconds, "milliseconds").locale(dayjs.locale()).from(durationReference, true);
}

export const toValidDate = (value: unknown): Date | null => {
  if (value == null || typeof value === "boolean") return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const isDateWithin = (date: Date, relativeDate: string): boolean => {
  if (relativeDate.length < 2) {
    throw new Error("Relative date must be at least 2 characters long");
  }

  const amount = parseInt(relativeDate.slice(0, -1), 10);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Relative date must be a number greater than 0");
  }

  const unit = relativeDate.slice(-1) as dayjs.UnitTypeShort;
  if (!validUnits.includes(unit)) {
    throw new Error("Invalid relative time unit");
  }

  const startDate = dayjs().subtract(amount, unit);
  return dayjs(date).isBetween(startDate, dayjs(), null, "[]");
};
