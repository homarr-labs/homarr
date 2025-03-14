import dayjs from "dayjs";
import objectSupport from "dayjs/plugin/objectSupport";
import utc from "dayjs/plugin/utc";
import * as ical from "node-ical";
import { DAVClient } from "tsdav";

import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import type { CalendarEvent } from "../calendar-types";

dayjs.extend(utc);
dayjs.extend(objectSupport);

export class NextcloudIntegration extends Integration {
  public async testConnectionAsync(): Promise<void> {
    const client = this.createCalendarClient();
    await client.login();
  }

  public async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    const client = this.createCalendarClient();
    await client.login();

    const calendars = await client.fetchCalendars();
    // Parameters must be in ISO-8601, See https://tsdav.vercel.app/docs/caldav/fetchCalendarObjects#arguments
    const calendarEvents = (
      await Promise.all(
        calendars.map(
          async (calendar) =>
            await client.fetchCalendarObjects({
              calendar,
              timeRange: { start: start.toISOString(), end: end.toISOString() },
            }),
        ),
      )
    ).flat();

    return calendarEvents.map((event): CalendarEvent => {
      // @ts-expect-error the typescript definitions for this package are wrong
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      const icalData = ical.default.parseICS(event.data) as ical.CalendarResponse;
      const veventObject = Object.values(icalData).find((data) => data.type === "VEVENT");

      if (!veventObject) {
        throw new Error(`Invalid event data object: ${JSON.stringify(event.data)}. Unable to process the calendar.`);
      }

      logger.debug(`Converting VEVENT event to ${event.etag} from Nextcloud: ${JSON.stringify(veventObject)}`);

      const date = dayjs.utc({
        days: veventObject.start.getDay(),
        month: veventObject.start.getMonth(),
        year: veventObject.start.getFullYear(),
        hours: veventObject.start.getHours(),
        minutes: veventObject.start.getMinutes(),
        seconds: veventObject.start.getSeconds(),
      });

      const eventUrlWithoutHost = new URL(event.url).pathname;
      const dateInMillis = veventObject.start.valueOf();

      const url = this.url(
        `/apps/calendar/timeGridWeek/now/edit/sidebar/${Buffer.from(eventUrlWithoutHost).toString("base64url")}/${dateInMillis / 1000}`,
      );

      return {
        name: veventObject.summary,
        date: date.toDate(),
        subName: "",
        description: veventObject.description,
        links: [
          {
            href: url.toString(),
            name: "Nextcloud",
            logo: "/images/apps/nextcloud.svg",
            color: undefined,
            notificationColor: "#ff8600",
            isDark: true,
          },
        ],
      };
    });
  }

  private createCalendarClient() {
    return new DAVClient({
      serverUrl: this.integration.url,
      credentials: {
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
  }
}
