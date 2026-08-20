import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import type { OptionDateTimeEvent } from "../options";

dayjs.extend(utc);
dayjs.extend(timezone);

const minuteMs = 60_000;
const dayMs = 86_400_000;
const timeZoneSupportCache = new Map<string, boolean>();

export interface WallDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface CountdownEventState {
  event: OptionDateTimeEvent;
  nextOccurrence: Date | null;
  previousOccurrence: Date | null;
  completed: boolean;
  invalid: boolean;
}

export const isCountdownTimeZoneSupported = (timeZone: string) => {
  const cached = timeZoneSupportCache.get(timeZone);
  if (cached !== undefined) return cached;
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    timeZoneSupportCache.set(timeZone, true);
    return true;
  } catch {
    timeZoneSupportCache.set(timeZone, false);
    return false;
  }
};

export const parseWallDateTime = (value: string): WallDateTime | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const parts: WallDateTime = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const validationDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
  if (
    validationDate.getUTCFullYear() !== parts.year ||
    validationDate.getUTCMonth() !== parts.month - 1 ||
    validationDate.getUTCDate() !== parts.day ||
    validationDate.getUTCHours() !== parts.hour ||
    validationDate.getUTCMinutes() !== parts.minute ||
    validationDate.getUTCSeconds() !== parts.second
  ) {
    return null;
  }
  return parts;
};

export const formatWallDateTime = (instant: string | Date, timeZone: string) => {
  if (!isCountdownTimeZoneSupported(timeZone)) return "";
  const value = dayjs(instant);
  if (!value.isValid()) return "";
  return value.tz(timeZone).format("YYYY-MM-DD HH:mm:ss");
};

const wallDateTimeEquals = (value: WallDateTime, candidate: dayjs.Dayjs) =>
  candidate.year() === value.year &&
  candidate.month() + 1 === value.month &&
  candidate.date() === value.day &&
  candidate.hour() === value.hour &&
  candidate.minute() === value.minute &&
  candidate.second() === value.second;

const resolveExactWallDateTime = (value: WallDateTime, timeZone: string): Date[] => {
  const naiveUtc = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
  const offsets = new Set<number>();
  for (const dayOffset of [-2, -1, 0, 1, 2]) {
    offsets.add(
      dayjs
        .utc(naiveUtc + dayOffset * dayMs)
        .tz(timeZone)
        .utcOffset(),
    );
  }

  const matches: Date[] = [];
  for (const offset of offsets) {
    const candidate = new Date(naiveUtc - offset * minuteMs);
    if (wallDateTimeEquals(value, dayjs(candidate).tz(timeZone))) matches.push(candidate);
  }
  // oxlint-disable-next-line unicorn/no-array-sort -- Array.toSorted is not supported in all target browsers.
  return [...matches].sort((left, right) => left.getTime() - right.getTime());
};

/** Resolves a local wall-clock value, preferring the earlier repeated time and the first valid time after a DST gap. */
export const resolveWallDateTime = (value: WallDateTime, timeZone: string): Date | null => {
  if (!isCountdownTimeZoneSupported(timeZone)) return null;
  const exactMatches = resolveExactWallDateTime(value, timeZone);
  if (exactMatches[0]) return exactMatches[0];

  const naiveUtc = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute);
  for (let minuteOffset = 1; minuteOffset <= 180; minuteOffset += 1) {
    const candidateWallDate = new Date(naiveUtc + minuteOffset * minuteMs);
    const candidateWall: WallDateTime = {
      year: candidateWallDate.getUTCFullYear(),
      month: candidateWallDate.getUTCMonth() + 1,
      day: candidateWallDate.getUTCDate(),
      hour: candidateWallDate.getUTCHours(),
      minute: candidateWallDate.getUTCMinutes(),
      second: candidateWallDate.getUTCSeconds(),
    };
    const matches = resolveExactWallDateTime(candidateWall, timeZone);
    if (matches[0]) return matches[0];
  }
  return null;
};

export const resolveWallDateTimeString = (value: string, timeZone: string) => {
  const wallDateTime = parseWallDateTime(value);
  if (!wallDateTime) return null;
  return resolveWallDateTime(wallDateTime, timeZone);
};

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const occurrenceForYear = (target: WallDateTime, year: number, timeZone: string) => {
  if (target.month === 2 && target.day === 29 && !isLeapYear(year)) return null;
  return resolveWallDateTime({ ...target, year }, timeZone);
};

const findYearlyOccurrence = (
  target: WallDateTime,
  timeZone: string,
  startYear: number,
  direction: 1 | -1,
  predicate: (date: Date) => boolean,
) => {
  for (let index = 0; index < 12; index += 1) {
    const occurrence = occurrenceForYear(target, startYear + index * direction, timeZone);
    if (occurrence && predicate(occurrence)) return occurrence;
  }
  return null;
};

export const getCountdownEventState = (event: OptionDateTimeEvent, now: Date): CountdownEventState => {
  const target = dayjs(event.targetUtc);
  if (!target.isValid() || !isCountdownTimeZoneSupported(event.timeZone)) {
    return { event, nextOccurrence: null, previousOccurrence: null, completed: false, invalid: true };
  }

  if (event.recurrence === "none") {
    const targetDate = target.toDate();
    const completed = targetDate.getTime() <= now.getTime();
    return {
      event,
      nextOccurrence: completed ? null : targetDate,
      previousOccurrence: completed ? targetDate : null,
      completed,
      invalid: false,
    };
  }

  const targetWall = parseWallDateTime(formatWallDateTime(event.targetUtc, event.timeZone));
  if (!targetWall) {
    return { event, nextOccurrence: null, previousOccurrence: null, completed: false, invalid: true };
  }
  const currentYear = dayjs(now).tz(event.timeZone).year();
  const nextOccurrence = findYearlyOccurrence(
    targetWall,
    event.timeZone,
    currentYear,
    1,
    (occurrence) => occurrence.getTime() > now.getTime(),
  );
  const previousOccurrence = findYearlyOccurrence(
    targetWall,
    event.timeZone,
    currentYear,
    -1,
    (occurrence) => occurrence.getTime() <= now.getTime(),
  );
  return {
    event,
    nextOccurrence,
    previousOccurrence,
    completed: false,
    invalid: nextOccurrence === null,
  };
};

export const getCountdownProgress = (state: CountdownEventState, now: Date): number | null => {
  let start: Date | null = null;
  let end: Date | null = null;

  if (state.event.recurrence === "yearly") {
    start = state.previousOccurrence;
    end = state.nextOccurrence;
  } else if (state.event.startUtc) {
    const parsedStart = dayjs(state.event.startUtc);
    const parsedEnd = dayjs(state.event.targetUtc);
    if (parsedStart.isValid() && parsedEnd.isValid()) {
      start = parsedStart.toDate();
      end = parsedEnd.toDate();
    }
  }

  if (!start || !end || end.getTime() <= start.getTime()) return null;
  const progress = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  return Math.min(100, Math.max(0, progress));
};

export const groupCountdownStates = (states: CountdownEventState[]) => {
  const upcoming = states.filter((state) => state.nextOccurrence !== null && !state.invalid);
  const completed = states.filter((state) => state.completed && state.previousOccurrence !== null && !state.invalid);
  const invalid = states.filter((state) => state.invalid);
  return { upcoming, completed, invalid };
};

export const getLatestReachedOccurrence = (event: OptionDateTimeEvent, now: Date) =>
  getCountdownEventState(event, now).previousOccurrence;
