import { describe, expect, test } from "vitest";

import type { CalendarEvent } from "@homarr/integrations/types";

import { getCalendarAgendaEvents, groupEventsByDate, moveCalendarMonth, splitEvents } from "./calendar-events";

describe("splitEvents should split multi-day events into multiple single-day events", () => {
  test("2 day all-day event should be split up into two all-day events", () => {
    const event = createEvent(new Date(2025, 0, 1), new Date(2025, 0, 3));

    const result = splitEvents([event]);

    expect(result).toHaveLength(2);
    expect(result[0]?.startDate).toEqual(event.startDate);
    expect(result[0]?.endDate).toEqual(new Date(new Date(2025, 0, 2).getTime() - 1));
    expect(result[1]?.startDate).toEqual(new Date(2025, 0, 2));
    // Because we want to end the event on the previous day, we have not the same endDate.
    // Otherwise there would be three single-day events, with the last being from 0:00 - 0:00
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result[1]?.endDate).toEqual(new Date(event.endDate!.getTime() - 1));
  });
  test("2 day partial event should be split up into two events", () => {
    const event = createEvent(new Date(2025, 0, 1, 15), new Date(2025, 0, 2, 9));

    const result = splitEvents([event]);

    expect(result).toHaveLength(2);
    expect(result[0]?.startDate).toEqual(event.startDate);
    expect(result[0]?.endDate).toEqual(new Date(new Date(2025, 0, 2).getTime() - 1));
    expect(result[1]?.startDate).toEqual(new Date(2025, 0, 2));
    expect(result[1]?.endDate).toEqual(event.endDate);
  });
  test("one day partial event should only have one event after split", () => {
    const event = createEvent(new Date(2025, 0, 1), new Date(2025, 0, 2));

    const result = splitEvents([event]);

    expect(result).toHaveLength(1);
  });
  test("without endDate should not be split", () => {
    const event = createEvent(new Date(2025, 0, 1));

    const result = splitEvents([event]);

    expect(result).toHaveLength(1);
  });
  test("startDate after endDate should not cause infinite loop", () => {
    const event = createEvent(new Date(2025, 0, 2), new Date(2025, 0, 1));

    const result = splitEvents([event]);

    expect(result).toHaveLength(0);
  });
});

describe("groupEventsByDate", () => {
  test("groups once per day and sorts each bucket", () => {
    const later = createEvent(new Date(2025, 0, 1, 18));
    const earlier = createEvent(new Date(2025, 0, 1, 9));
    const nextDay = createEvent(new Date(2025, 0, 2, 9));

    const result = groupEventsByDate([later, nextDay, earlier]);

    expect(result.size).toBe(2);
    expect([...result.values()][0]).toEqual([earlier, later]);
  });
});

describe("getCalendarAgendaEvents", () => {
  test("keeps overlapping original events once and excludes adjacent-month events", () => {
    const spansIntoMonth = createEvent(new Date(2024, 11, 31, 22), new Date(2025, 0, 2, 8));
    const inMonth = createEvent(new Date(2025, 0, 20, 9));
    const endsAtMonthStart = createEvent(new Date(2024, 11, 31), new Date(2025, 0, 1));
    const nextMonth = createEvent(new Date(2025, 1, 1));

    const result = getCalendarAgendaEvents(
      [nextMonth, spansIntoMonth, endsAtMonthStart, inMonth],
      new Date(2025, 0, 15),
      [],
    );

    expect(result).toEqual([spansIntoMonth, inMonth]);
  });

  test("applies Radarr release filters without splitting multi-day events", () => {
    const cinema = createEvent(new Date(2025, 0, 5), new Date(2025, 0, 8));
    cinema.metadata = { type: "radarr", releaseType: "inCinemas" };
    const digital = createEvent(new Date(2025, 0, 7));
    digital.metadata = { type: "radarr", releaseType: "digitalRelease" };

    expect(getCalendarAgendaEvents([cinema, digital], new Date(2025, 0, 1), ["inCinemas"])).toEqual([cinema]);
  });

  test("preserves source ownership through advanced filtering", () => {
    const event = {
      ...createEvent(new Date(2025, 0, 5)),
      source: { integrationId: "calendar-1", integrationName: "Family calendar" },
    };

    expect(getCalendarAgendaEvents([event], new Date(2025, 0, 1), [])).toEqual([event]);
  });
});

describe("moveCalendarMonth", () => {
  test("uses the first day so short months do not skip", () => {
    expect(moveCalendarMonth(new Date(2025, 0, 31), 1)).toEqual(new Date(2025, 1, 1));
    expect(moveCalendarMonth(new Date(2025, 2, 31), -1)).toEqual(new Date(2025, 1, 1));
  });
});

const createEvent = (startDate: Date, endDate: Date | null = null): CalendarEvent => ({
  title: "Test",
  subTitle: null,
  description: null,
  startDate,
  endDate,
  image: null,
  indicatorColor: "red",
  links: [],
  location: null,
});
