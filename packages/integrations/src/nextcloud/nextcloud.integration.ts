import { Integration } from "../base/integration";
import type { CalendarEvent } from "../calendar-types";
import { DAVClient } from 'tsdav';
import * as ical from 'node-ical';
import { logger } from "@homarr/log";
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc';
import objectSupport from 'dayjs/plugin/objectSupport';
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

    if (calendars.length === 0) {
      logger.warn("Unable to fetch calendars from Nextcloud. No calendar was returned from the server");
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const calendarEvents = await client.fetchCalendarObjects({ calendar: calendars[0]! });

    return calendarEvents.map((event): CalendarEvent => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const icalData = ical.parseICS(event.data);
      const veventObject = Object.values(icalData).find(data => data.type === 'VEVENT');
      logger.info(JSON.stringify(icalData));
      logger.info(JSON.stringify({ millis: veventObject?.start.getMilliseconds() }));
      return ({
        name: veventObject?.summary ?? 'NO NAME',
        date: dayjs({ milliseconds: veventObject?.start.getMilliseconds() }).toDate(),
        subName: '',
        description: veventObject?.description,
        links: [
          {
            href: event.url,
            name: 'Nextcloud',
            logo: '"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nextcloud.svg"',
            color: undefined,
            isDark: true
          }
        ]
      });
    });
  }

  private createCalendarClient() {
    return new DAVClient({
      serverUrl: this.integration.url,
      credentials: {
        username: this.getSecretValueOrDefault('username'),
        password: this.getSecretValueOrDefault('password'),
        accessToken: this.getSecretValueOrDefault('apiKey')
      },
      authMethod: this.hasSecretValue('username') ? 'Basic' : undefined,
      defaultAccountType: 'caldav'
    });
  }
}
