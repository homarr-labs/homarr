/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../interfaces/calendar/calendar-types";
import ICAL from "ical.js";

export class ICalIntegration extends Integration implements ICalendarIntegration {
    async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]>  {
        const response = await fetchWithTrustedCertificatesAsync(this.integration.url);
        const result = await response.text();
        const jcal = ICAL.parse(result)
        const comp = new ICAL.Component(jcal);
        
        return comp.getAllSubcomponents("vevent").reduce((prev, vevent) => {
            const event = new ICAL.Event(vevent);
            const startDate = event.startDate.toJSDate();
            const endDate = event.endDate.toJSDate();
            if (startDate >= start && endDate <= end) {
                const evn: CalendarEvent = {
                    name: event.summary,
                    subName: '',
                    description: event.description,
                    date: event.startDate.toJSDate(),
                    links: [{
                        color: '#00aaaa',
                        notificationColor: '#aaaa00',
                        href: event.location ?? '',
                        isDark: undefined,
                        logo: '',
                        name: event.summary ?? '',
                    }],
                    metadata: {
                        type: 'event',
                        startDate: event.startDate.toJSDate(),
                        endDate: event.endDate.toJSDate(),
                        location: event.location,
                        organizer: event.organizer,
                        attendees: event.attendees.map(prop => prop.getValues()?.toString().replace('mailto:', '') ?? ''),
                        color: event.color,
                        duration: event.duration.toICALString(),
                        calendarName: (event.component.parent?.getFirstPropertyValue("x-wr-calname") ?? undefined) as string | undefined,
                        timezone: (event.component.parent?.getFirstPropertyValue("x-wr-timezone") ?? undefined) as string | undefined
                    }
                }
                console.log(evn);
                event.attendees.forEach(attendee => console.log(attendee.jCal))
                // console.log(event.attendees);
                prev.push(evn);
            }
            return prev;
        }, [] as CalendarEvent[]);
    }

    protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
        console.log(this.integration.url);
        const response = await input.fetchAsync(this.integration.url);
        console.log(response);
        if (!response.ok) return TestConnectionError.StatusResult(response);
    
        await response.text();
        return { success: true };
    }
}