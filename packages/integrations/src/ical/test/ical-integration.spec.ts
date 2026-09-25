// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { ICalIntegration } from "../ical-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const { warnSpy } = vi.hoisted(() => ({ warnSpy: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: warnSpy, error: vi.fn() }),
}));

process.env.TZ = "UTC"; // pins the host timezone so the floating-time tests below are deterministic
const CALENDAR_URL = "https://ical.example.com/feed.ics";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = () =>
  new ICalIntegration({
    id: "test-ical",
    name: "Test iCal",
    url: CALENDAR_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "url", value: CALENDAR_URL }] satisfies IntegrationSecret[],
  });

const mockCalendarResponse = (icsBody: string) => {
  mockFetch.mockImplementation(
    () =>
      Promise.resolve(new Response(icsBody, { status: 200 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >,
  );
};

beforeEach(() => {
  mockFetch.mockReset();
  warnSpy.mockClear();
});

const mockCalendar = (...blocks: string[]) =>
  mockCalendarResponse(
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//homarr-test//spec//EN", ...blocks, "END:VCALENDAR"].join("\r\n"),
  );

const EUROPE_BERLIN_VTIMEZONE =
  "BEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE";

const windowStart = new Date("2026-03-01T00:00:00Z");
const windowEnd = new Date("2026-03-31T23:59:59Z");
const windowEndMidnight = new Date("2026-03-31T00:00:00Z");

const sortedStartIsoStrings = (events: { title: string; startDate: Date }[], title: string) =>
  events
    .filter((calendarEvent) => calendarEvent.title === title)
    .map((calendarEvent) => calendarEvent.startDate.toISOString())
    .toSorted();

describe("ICalIntegration.getCalendarEventsAsync", () => {
  test("returns every occurrence of a weekly series that started before the window", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:weekly-before-window@example.com\r\nDTSTAMP:20260101T000000Z\r\nDTSTART:20260101T090000Z\r\nDTEND:20260101T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=52\r\nSUMMARY:Weekly standup\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);
    const matching = events.filter((calendarEvent) => calendarEvent.title === "Weekly standup");

    expect(matching.map((calendarEvent) => calendarEvent.startDate.toISOString()).toSorted()).toStrictEqual([
      "2026-03-05T09:00:00.000Z",
      "2026-03-12T09:00:00.000Z",
      "2026-03-19T09:00:00.000Z",
      "2026-03-26T09:00:00.000Z",
    ]);
    for (const calendarEvent of matching) {
      expect(calendarEvent.endDate?.toISOString()).toBe(
        new Date(calendarEvent.startDate.getTime() + 60 * 60 * 1000).toISOString(),
      );
    }
  });

  test("returns each occurrence of a series that starts inside the window", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:starts-inside-window@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=10\r\nSUMMARY:Weekly retrospective\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Weekly retrospective")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-09T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
      "2026-03-30T09:00:00.000Z",
    ]);
  });

  test("skips an occurrence cancelled with EXDATE", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:cancelled-occurrence@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE:20260309T090000Z\r\nSUMMARY:Weekly planning\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Weekly planning")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
  });

  test("reports an occurrence modified by RECURRENCE-ID once, with its modified data", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:overridden-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Weekly sync\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:overridden-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T140000Z\r\nDTEND:20260309T150000Z\r\nSUMMARY:Weekly sync (moved to the afternoon)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEndMidnight);
    const overriddenOccurrences = events.filter(
      (calendarEvent) => calendarEvent.startDate.getTime() === new Date("2026-03-09T14:00:00Z").getTime(),
    );

    expect(overriddenOccurrences.length).toBe(1);
    expect(overriddenOccurrences[0]?.title).toBe("Weekly sync (moved to the afternoon)");
    const unmodifiedOriginalSlot = events.filter(
      (calendarEvent) => calendarEvent.startDate.getTime() === new Date("2026-03-09T09:00:00Z").getTime(),
    );
    expect(unmodifiedOriginalSlot.length).toBe(0);
  });

  test("keeps the rest of a series after one occurrence is rescheduled past the window", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:rescheduled-past-window@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=5\r\nSUMMARY:Blocker series\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:rescheduled-past-window@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20261209T090000Z\r\nDTEND:20261209T100000Z\r\nSUMMARY:Blocker series (moved to December)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Blocker series")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
      "2026-03-30T09:00:00.000Z",
    ]);
    expect(events.map((calendarEvent) => calendarEvent.title)).not.toContain("Blocker series (moved to December)");
  });

  test("returns a non recurring master and its RECURRENCE-ID sibling with the same uid", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:non-recurring-with-sibling@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260305T090000Z\r\nDTEND:20260305T100000Z\r\nSUMMARY:Original slot\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:non-recurring-with-sibling@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260305T090000Z\r\nDTSTART:20260306T090000Z\r\nDTEND:20260306T100000Z\r\nSUMMARY:Sibling slot\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);
    const titles = events.map((calendarEvent) => calendarEvent.title).toSorted();

    expect(titles).toStrictEqual(["Original slot", "Sibling slot"]);
  });

  test("returns an override whose RECURRENCE-ID is not one of the master's current rule slots", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:re-edited-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Series slot\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:re-edited-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260310T090000Z\r\nDTSTART:20260310T150000Z\r\nDTEND:20260310T160000Z\r\nSUMMARY:Stale override\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Series slot")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-09T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
    expect(events.filter((calendarEvent) => calendarEvent.title === "Stale override").length).toBe(1);
  });

  test("emits an override exactly once when two master VEVENTs share its uid", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:shared-uid-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Series A slot\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:shared-uid-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Series B slot\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:shared-uid-series@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T090000Z\r\nDTEND:20260309T100000Z\r\nSUMMARY:Shared override\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(events.filter((calendarEvent) => calendarEvent.title === "Shared override").length).toBe(1);
    expect(sortedStartIsoStrings(events, "Series A slot")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Series B slot")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
  });

  test("returns every later occurrence of a RANGE=THISANDFUTURE override, shifted, exactly once each", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:range-thisandfuture@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=5\r\nSUMMARY:Range master\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:range-thisandfuture@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID;RANGE=THISANDFUTURE:20260316T090000Z\r\nDTSTART:20260316T140000Z\r\nDTEND:20260316T150000Z\r\nSUMMARY:Range moved this and future\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Range master")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-09T09:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Range moved this and future")).toStrictEqual([
      "2026-03-16T14:00:00.000Z",
      "2026-03-23T14:00:00.000Z",
      "2026-03-30T14:00:00.000Z",
    ]);
  });

  test("attaches an override only to the master sharing its uid, not to an unrelated series", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:guard-series-a@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Guard series A\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:guard-series-b@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Guard series B\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:guard-series-a@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T090000Z\r\nDTEND:20260309T100000Z\r\nSUMMARY:Guard series A override\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(events.filter((calendarEvent) => calendarEvent.title === "Guard series A override").length).toBe(1);
    expect(sortedStartIsoStrings(events, "Guard series A")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Guard series B")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-09T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
  });

  test("keeps a single non recurring event in the window and drops one outside it", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:inside-window@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260310T090000Z\r\nDTEND:20260310T100000Z\r\nSUMMARY:One off inside\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:outside-window@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260601T090000Z\r\nDTEND:20260601T100000Z\r\nSUMMARY:One off outside\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEndMidnight);
    const titles = events.map((calendarEvent) => calendarEvent.title);

    expect(titles).toContain("One off inside");
    expect(titles).not.toContain("One off outside");
  });

  test("emits an orphan RECURRENCE-ID event whose master is absent", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:orphan-override@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T140000Z\r\nDTEND:20260309T150000Z\r\nSUMMARY:Orphan override\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEndMidnight);
    const titles = events.map((calendarEvent) => calendarEvent.title);

    expect(titles).toContain("Orphan override");
  });

  test("stops instead of hanging on an unbounded high frequency rule", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:unbounded-secondly@example.com\r\nDTSTAMP:20000101T000000Z\r\nDTSTART:20000101T000000Z\r\nDTEND:20000101T000001Z\r\nRRULE:FREQ=SECONDLY\r\nSUMMARY:Pathological rule\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEndMidnight);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(events.filter((calendarEvent) => calendarEvent.title === "Pathological rule").length).toBe(0);
  });

  test("emits an override once when the master carries a TZID and the RECURRENCE-ID is in UTC", async () => {
    mockCalendar(
      EUROPE_BERLIN_VTIMEZONE,
      "BEGIN:VEVENT\r\nUID:tzid-master-utc-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART;TZID=Europe/Berlin:20260302T090000\r\nDTEND;TZID=Europe/Berlin:20260302T100000\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Berlin weekly\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:tzid-master-utc-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T080000Z\r\nDTSTART;TZID=Europe/Berlin:20260309T140000\r\nDTEND;TZID=Europe/Berlin:20260309T150000\r\nSUMMARY:Berlin weekly (moved)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Berlin weekly")).toStrictEqual([
      "2026-03-02T08:00:00.000Z",
      "2026-03-16T08:00:00.000Z",
      "2026-03-23T08:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Berlin weekly (moved)")).toStrictEqual(["2026-03-09T13:00:00.000Z"]);
    expect(events.length).toBe(4);
  });

  test("emits an override once when the master is floating and the RECURRENCE-ID is in UTC", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:floating-master-utc-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000\r\nDTEND:20260302T100000\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Floating weekly\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:floating-master-utc-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T140000\r\nDTEND:20260309T150000\r\nSUMMARY:Floating weekly (moved)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Floating weekly")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
      "2026-03-23T09:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Floating weekly (moved)")).toStrictEqual(["2026-03-09T14:00:00.000Z"]);
    expect(events.length).toBe(4);
  });

  test("emits an override once when the master carries a TZID and the RECURRENCE-ID is floating", async () => {
    mockCalendar(
      EUROPE_BERLIN_VTIMEZONE,
      "BEGIN:VEVENT\r\nUID:tzid-master-floating-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART;TZID=Europe/Berlin:20260302T090000\r\nDTEND;TZID=Europe/Berlin:20260302T100000\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Berlin floating id\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:tzid-master-floating-recurrence-id@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000\r\nDTSTART;TZID=Europe/Berlin:20260309T140000\r\nDTEND;TZID=Europe/Berlin:20260309T150000\r\nSUMMARY:Berlin floating id (moved)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Berlin floating id")).toStrictEqual([
      "2026-03-02T08:00:00.000Z",
      "2026-03-16T08:00:00.000Z",
      "2026-03-23T08:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Berlin floating id (moved)")).toStrictEqual(["2026-03-09T13:00:00.000Z"]);
    expect(events.length).toBe(4);
  });

  test("emits an override once when the feed repeats the same exception VEVENT twice", async () => {
    mockCalendar(
      "BEGIN:VEVENT\r\nUID:repeated-exception@example.com\r\nDTSTAMP:20260301T000000Z\r\nDTSTART:20260302T090000Z\r\nDTEND:20260302T100000Z\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nSUMMARY:Repeated series\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:repeated-exception@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T140000Z\r\nDTEND:20260309T150000Z\r\nSUMMARY:Repeated series (moved)\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nUID:repeated-exception@example.com\r\nDTSTAMP:20260301T000000Z\r\nRECURRENCE-ID:20260309T090000Z\r\nDTSTART:20260309T140000Z\r\nDTEND:20260309T150000Z\r\nSUMMARY:Repeated series (moved)\r\nEND:VEVENT",
    );

    const events = await createIntegration().getCalendarEventsAsync(windowStart, windowEnd);

    expect(sortedStartIsoStrings(events, "Repeated series")).toStrictEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-16T09:00:00.000Z",
    ]);
    expect(sortedStartIsoStrings(events, "Repeated series (moved)")).toStrictEqual(["2026-03-09T14:00:00.000Z"]);
    expect(events.length).toBe(3);
  });
});
