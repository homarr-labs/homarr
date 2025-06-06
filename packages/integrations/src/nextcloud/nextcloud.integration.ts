import * as ical from "node-ical";
import { DAVClient } from "tsdav";
import type { Dispatcher, RequestInit as UndiciFetchRequestInit } from "undici";

import { createCertificateAgentAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationTsdavHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { CalendarEvent } from "../calendar-types";

@HandleIntegrationErrors([integrationTsdavHttpErrorHandler])
export class NextcloudIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.createCalendarClientAsync(input.dispatcher);
    await client.login();

    return { success: true };
  }

  public async getCalendarEventsAsync(start: Date, end: Date, _showUnmonitored?: boolean): Promise<CalendarEvent[]> {
    const client = await this.createCalendarClientAsync();
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

      const date = veventObject.start;

      const eventUrlWithoutHost = new URL(event.url).pathname;
      const dateInMillis = veventObject.start.valueOf();

      const url = this.url(
        `/apps/calendar/timeGridWeek/now/edit/sidebar/${Buffer.from(eventUrlWithoutHost).toString("base64url")}/${dateInMillis / 1000}`,
      );

      return {
        name: veventObject.summary,
        date,
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

  private async createCalendarClientAsync(dispatcher?: Dispatcher) {
    return new DAVClient({
      serverUrl: this.integration.url,
      credentials: {
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
      fetchOptions: {
        // We can use the undici options as the global fetch is used instead of the polyfilled.
        dispatcher: dispatcher ?? (await createCertificateAgentAsync()),
      } satisfies UndiciFetchRequestInit as RequestInit,
    });
  }
}
