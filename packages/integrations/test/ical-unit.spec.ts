// @vitest-environment node

import { Response } from "undici";
import { expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { ICalIntegration } from "../src/ical/ical-integration";

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));
vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const calendarEvent = (uid: string, summary: string, properties: string[]) =>
  ["BEGIN:VEVENT", `UID:${uid}`, `SUMMARY:${summary}`, ...properties, "END:VEVENT"].join("\r\n");

test.each([false, true])("keeps override feed order and unrelated UIDs isolated (reverse: %s)", async (reverse) => {
  const overrides = [
    calendarEvent("alpha", "First edit", [
      "RECURRENCE-ID:20261002T090000Z",
      "DTSTART:20261002T110000Z",
      "DTEND:20261002T120000Z",
    ]),
    calendarEvent("alpha", "Second edit", [
      "RECURRENCE-ID:20261002T090000Z",
      "DTSTART:20261002T130000Z",
      "DTEND:20261002T140000Z",
    ]),
  ];
  if (reverse) overrides.reverse();

  const source = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...overrides,
    calendarEvent("beta", "Beta edit", [
      "RECURRENCE-ID:20261002T090000Z",
      "DTSTART:20261002T150000Z",
      "DTEND:20261002T160000Z",
    ]),
    ...["alpha", "beta"].map((uid) =>
      calendarEvent(uid, uid, ["DTSTART:20261001T090000Z", "DTEND:20261001T100000Z", "RRULE:FREQ=DAILY;COUNT=2"]),
    ),
    "END:VCALENDAR",
  ].join("\r\n");
  vi.mocked(fetchWithTrustedCertificatesAsync).mockResolvedValue(new Response(source));
  const integration = new ICalIntegration({
    id: "test-ical",
    name: "Test iCal",
    url: "https://calendar.example.com",
    externalUrl: null,
    decryptedSecrets: [{ kind: "url", value: "https://calendar.example.com/feed.ics" }],
  });

  const events = await integration.getCalendarEventsAsync(
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-03T00:00:00Z"),
  );

  expect(events.map(({ title, startDate }) => [title, startDate.toISOString()])).toStrictEqual([
    ["alpha", "2026-10-01T09:00:00.000Z"],
    [reverse ? "First edit" : "Second edit", reverse ? "2026-10-02T11:00:00.000Z" : "2026-10-02T13:00:00.000Z"],
    ["beta", "2026-10-01T09:00:00.000Z"],
    ["Beta edit", "2026-10-02T15:00:00.000Z"],
  ]);
});
