import ICAL from "ical.js";

import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";
import { SpecialistProtocol, specialistParseResult } from "./protocol";

const MAX_OCCURRENCE_ITERATIONS = 100000;

const calendarEvent = (event: ICAL.Event, startDate: Date, endDate: Date): CalendarEvent => ({
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

export class IcalProtocol extends SpecialistProtocol {
  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    throw new Error("iCal stores a private feed URL, which cannot authenticate arbitrary HTTP requests");
  }

  async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const result = await http.responseAsync(this.secret("url"), {}, (response) => response.text());
      const comp = ICAL.Component.fromString(result);
      const masters: ICAL.Component[] = [];
      const exceptions: ICAL.Component[] = [];
      const byUid = new Map<string, ICAL.Component[]>();
      for (const vevent of comp.getAllSubcomponents("vevent")) {
        const event = new ICAL.Event(vevent, { exceptions: [] });
        if (event.isRecurrenceException()) {
          exceptions.push(vevent);
          const bucket = byUid.get(event.uid) ?? [];
          bucket.push(vevent);
          byUid.set(event.uid, bucket);
        } else masters.push(vevent);
      }
      const events: CalendarEvent[] = [];
      const emittedKeys = new Set<string>();
      const emittedComponents = new Set<ICAL.Component>();
      for (const master of masters) {
        this.resources.context.signal.throwIfAborted();
        const event = new ICAL.Event(master, { exceptions: [] });
        for (const exception of byUid.get(event.uid) ?? []) event.relateException(exception);
        if (!event.isRecurring()) {
          const startDate = event.startDate.toJSDate();
          const endDate = event.endDate.toJSDate();
          if (startDate <= end && endDate >= start) events.push(calendarEvent(event, startDate, endDate));
          continue;
        }
        const iterator = event.iterator();
        let next: ICAL.Time | undefined;
        let iterations = 0;
        while ((next = iterator.next())) {
          this.resources.context.signal.throwIfAborted();
          if (iterations >= MAX_OCCURRENCE_ITERATIONS) {
            this.resources.log?.write("warn", "iCal occurrence iteration limit reached", {
              maxOccurrences: MAX_OCCURRENCE_ITERATIONS,
              truncated: true,
            });
            break;
          }
          iterations++;
          if (next.toJSDate() > end) break;
          const details = event.getOccurrenceDetails(next);
          const startDate = details.startDate.toJSDate();
          const endDate = details.endDate.toJSDate();
          if (startDate > end || endDate < start) continue;
          if (details.item.isRecurrenceException()) {
            const key = `${details.item.uid}:${details.recurrenceId.toString()}`;
            if (emittedKeys.has(key)) continue;
            emittedKeys.add(key);
            emittedComponents.add(details.item.component);
          }
          events.push(calendarEvent(details.item, startDate, endDate));
        }
      }
      for (const exception of exceptions) {
        if (emittedComponents.has(exception)) continue;
        const event = new ICAL.Event(exception, { exceptions: [] });
        if (emittedKeys.has(`${event.uid}:${event.recurrenceId.toString()}`)) continue;
        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate.toJSDate();
        if (startDate <= end && endDate >= start) events.push(calendarEvent(event, startDate, endDate));
      }
      return events;
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(this.secret("url"), {}, async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult({ status: response.status, url: this.integration.url });
      const text = await response.text();
      try {
        return ICAL.Component.fromString(text).getAllSubcomponents("vevent").length > 0
          ? { success: true }
          : specialistParseResult("No events found");
      } catch {
        return specialistParseResult("Failed to parse calendar");
      }
    });
  }
}
