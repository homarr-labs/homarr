import ICAL from "ical.js";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../interfaces/calendar/calendar-types";

export class ICalIntegration extends Integration implements ICalendarIntegration {
  async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.integration.url);
    const result = await response.text();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jcal = ICAL.parse(result);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const comp = new ICAL.Component(jcal);

    return comp.getAllSubcomponents("vevent").reduce((prev, vevent) => {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      if (startDate >= start && endDate <= end) {
        const evn: CalendarEvent = {
          name: event.summary,
          subName: "",
          description: event.description,
          date: event.startDate.toJSDate(),
          links: [
            {
              color: undefined,
              notificationColor: "red",
              isDark: undefined,
              logo: "",
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              name: event.summary ?? "",
            },
          ],
          metadata: {
            type: "event",
            startDate: event.startDate.toJSDate(),
            endDate: event.endDate.toJSDate(),
            location: event.location,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            calendarName: (event.component.parent?.getFirstPropertyValue("x-wr-calname") ?? undefined) as
              | string
              | undefined,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            timezone: (event.component.parent?.getFirstPropertyValue("x-wr-timezone") ?? undefined) as
              | string
              | undefined,
          },
        };
        prev.push(evn);
      }
      return prev;
    }, [] as CalendarEvent[]);
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.integration.url);
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
