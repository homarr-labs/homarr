import ICAL from "ical.js";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../interfaces/calendar/calendar-types";

const logger = createLogger({ module: "icalIntegration" });

// Caps the walk so a high frequency rule on an untrusted feed can't hang the request.
const MAX_OCCURRENCE_ITERATIONS = 100000;

const toCalendarEvent = (event: ICAL.Event, startDate: Date, endDate: Date): CalendarEvent => ({
  title: event.summary,
  subTitle: null,
  description: event.description,
  startDate,
  endDate,
  image: null,
  location: event.location,
  indicatorColor: "red",
  links: [],
});

// convertToZone only converts a zoned date-time; a DATE or floating time is reinterpreted, as ical.js does.
const isConvertible = (time: ICAL.Time) => !time.isDate && time.zone !== ICAL.Timezone.localTimezone;

// ical.js reinterprets the zone of a THISANDFUTURE occurrence instead of converting it; convert it where possible.
const shiftMismatchedRange = (range: ICAL.Event, occurrence: ICAL.Time) => {
  if (!range.modifiesFuture()) return undefined;
  if (![occurrence, range.recurrenceId, range.startDate].every(isConvertible)) return undefined;
  const zone = range.startDate.zone;
  const startDate = occurrence.convertToZone(zone);
  startDate.addDuration(range.startDate.subtractDate(range.recurrenceId.convertToZone(zone)));
  const endDate = startDate.clone();
  endDate.addDuration(range.duration);
  return { startDate, endDate };
};

export class ICalIntegration extends Integration implements ICalendarIntegration {
  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    throw new Error("iCal stores a private feed URL, which cannot authenticate arbitrary HTTP requests");
  }

  async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    const response = await fetchWithTrustedCertificatesAsync(super.getSecretValue("url"));
    const result = await response.text();
    const jcal = ICAL.parse(result) as unknown[];
    const comp = new ICAL.Component(jcal);

    const vevents = comp.getAllSubcomponents("vevent");
    const masterVevents: ICAL.Component[] = [];
    const exceptionVevents: ICAL.Component[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent, { exceptions: [] });
      if (event.isRecurrenceException()) {
        exceptionVevents.push(vevent);
      } else {
        masterVevents.push(vevent);
      }
    }

    const events: CalendarEvent[] = [];
    const emittedExceptionKeys = new Set<string>();
    const emittedExceptionComponents = new Set<ICAL.Component>();

    for (const masterVevent of masterVevents) {
      // exceptions: [] so an unrelated series sharing no uid is never auto-attached; uids are matched by hand below.
      const event = new ICAL.Event(masterVevent, { exceptions: [] });

      // ical.js matches an override to a slot by rendered string, which misses a zoned RECURRENCE-ID.
      const overridesByInstant = new Map<number, ICAL.Event>();

      for (const exceptionVevent of exceptionVevents) {
        const exceptionEvent = new ICAL.Event(exceptionVevent, { exceptions: [] });
        if (exceptionEvent.uid !== event.uid) continue;

        event.relateException(exceptionVevent);
        // A floating time is a wall clock, not an instant: toUnixTime() would read it as UTC and hit the wrong slot.
        if (exceptionEvent.recurrenceId.zone !== ICAL.Timezone.localTimezone) {
          overridesByInstant.set(exceptionEvent.recurrenceId.toUnixTime(), exceptionEvent);
        }
      }

      if (!event.isRecurring()) {
        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate.toJSDate();

        if (startDate > end) continue;
        if (endDate < start) continue;

        events.push(toCalendarEvent(event, startDate, endDate));
        continue;
      }

      const iterator = event.iterator();
      let next: ICAL.Time | undefined;
      let iterations = 0;
      let cappedByIterationLimit = false;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while ((next = iterator.next())) {
        if (iterations >= MAX_OCCURRENCE_ITERATIONS) {
          cappedByIterationLimit = true;
          break;
        }
        iterations++;

        if (next.toJSDate() > end) break;

        const details = event.getOccurrenceDetails(next);
        const overrideAtInstant = overridesByInstant.get(next.toUnixTime());
        const resolved = overrideAtInstant ?? details.item;
        const times = overrideAtInstant ?? shiftMismatchedRange(details.item, next) ?? details;
        const startDate = times.startDate.toJSDate();
        const endDate = times.endDate.toJSDate();

        if (startDate > end) continue;
        if (endDate < start) continue;

        if (resolved.isRecurrenceException()) {
          // Keyed on details.recurrenceId, not details.item.recurrenceId: for a RANGE=THISANDFUTURE
          // override those collapse to the same value for every later occurrence, which would drop them.
          const exceptionKey = `${resolved.uid}:${details.recurrenceId.toString()}`;
          if (emittedExceptionKeys.has(exceptionKey)) continue;
          emittedExceptionKeys.add(exceptionKey);
          emittedExceptionComponents.add(resolved.component);
        }

        events.push(toCalendarEvent(resolved, startDate, endDate));
      }

      if (cappedByIterationLimit) {
        logger.warn(
          `iCal integration "${this.integration.id}": stopped expanding a recurring event after ${MAX_OCCURRENCE_ITERATIONS} occurrences (MAX_OCCURRENCE_ITERATIONS); some occurrences in the requested window may be missing`,
        );
      }
    }

    for (const exceptionVevent of exceptionVevents) {
      if (emittedExceptionComponents.has(exceptionVevent)) continue;
      const exceptionEvent = new ICAL.Event(exceptionVevent, { exceptions: [] });
      const key = `${exceptionEvent.uid}:${exceptionEvent.recurrenceId.toString()}`;
      if (emittedExceptionKeys.has(key)) continue;

      const startDate = exceptionEvent.startDate.toJSDate();
      const endDate = exceptionEvent.endDate.toJSDate();

      if (startDate > end) continue;
      if (endDate < start) continue;

      events.push(toCalendarEvent(exceptionEvent, startDate, endDate));
    }

    return events;
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(super.getSecretValue("url"));
    if (!response.ok) return TestConnectionError.StatusResult(response);

    const result = await response.text();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jcal = ICAL.parse(result);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const comp = new ICAL.Component(jcal);
      return comp.getAllSubcomponents("vevent").length > 0
        ? { success: true }
        : TestConnectionError.ParseResult({
            name: "Calendar parse error",
            message: "No events found",
            cause: new Error("No events found"),
          });
    } catch (error) {
      return TestConnectionError.ParseResult({
        name: "Calendar parse error",
        message: "Failed to parse calendar",
        cause: error as Error,
      });
    }
  }
}
