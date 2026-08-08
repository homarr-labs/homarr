import dayjs from "dayjs";

import type { CalendarEvent } from "@homarr/integrations/types";

export const toCalendarDateKey = (date: Date) => dayjs(date).format("YYYY-MM-DD");

export const moveCalendarMonth = (month: Date, amount: number): Date =>
  dayjs(month).startOf("month").add(amount, "month").toDate();

const matchesReleaseType = (event: CalendarEvent, releaseTypes: readonly string[]) =>
  event.metadata?.type !== "radarr" || releaseTypes.includes(event.metadata.releaseType);

export const getCalendarAgendaEvents = (
  events: CalendarEvent[],
  viewedMonth: Date,
  releaseTypes: readonly string[],
): CalendarEvent[] => {
  const monthStart = dayjs(viewedMonth).startOf("month");
  const monthEnd = monthStart.add(1, "month");

  return events
    .filter((event) => {
      if (!matchesReleaseType(event, releaseTypes)) return false;

      const start = dayjs(event.startDate);
      if (!event.endDate) return !start.isBefore(monthStart) && start.isBefore(monthEnd);

      // Calendar intervals are half-open: an all-day event ending at midnight does not occupy the next day.
      return start.isBefore(monthEnd) && dayjs(event.endDate).isAfter(monthStart);
    })
    .toSorted((eventA, eventB) => eventA.startDate.getTime() - eventB.startDate.getTime());
};

export const groupEventsByDate = (events: CalendarEvent[]): Map<string, CalendarEvent[]> => {
  const result = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = toCalendarDateKey(event.startDate);
    const entries = result.get(key) ?? [];
    entries.push(event);
    result.set(key, entries);
  }

  return new Map(
    [...result.entries()]
      .toSorted(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, entries]) => [
        date,
        entries.toSorted((eventA, eventB) => eventA.startDate.getTime() - eventB.startDate.getTime()),
      ]),
  );
};

/** Splits multi-day events into single-day calendar tiles. */
export const splitEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  const splitEventEntries: CalendarEvent[] = [];
  for (const event of events) {
    if (!event.endDate) {
      splitEventEntries.push(event);
      continue;
    }

    if (dayjs(event.startDate).isSame(event.endDate, "day")) {
      splitEventEntries.push(event);
      continue;
    }

    if (dayjs(event.startDate).isAfter(event.endDate)) continue;

    let currentStart = dayjs(event.startDate);
    while (currentStart.isBefore(event.endDate)) {
      splitEventEntries.push({
        ...event,
        startDate: currentStart.toDate(),
        endDate: currentStart.endOf("day").isAfter(event.endDate) ? event.endDate : currentStart.endOf("day").toDate(),
      });
      currentStart = currentStart.add(1, "day").startOf("day");
    }
  }
  return splitEventEntries;
};
