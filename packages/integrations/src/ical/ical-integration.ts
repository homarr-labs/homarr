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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jcal = ICAL.parse(result);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const comp = new ICAL.Component(jcal);

        // TODO(nn): reduce instead of filter map
        return comp.getAllSubcomponents("vevent").filter((vevent) => {
            const event = new ICAL.Event(vevent);
            const startA = event.startDate.toJSDate()
            const endA = event.endDate.toJSDate()
            console.log('-------------------');
            console.log(startA, endA);
            console.log(start, end);
            console.log(startA >= start && endA <= end);
            console.log(event.summary, event.location, event.color)
            console.log('-------------------');
            return event.startDate.toJSDate() >= start && event.endDate.toJSDate() <= end;
        }).map((vevent): CalendarEvent => {
            const event = new ICAL.Event(vevent);
            console.log('passed filter');
            return {
                name: event.summary,
                subName: '',
                description: event.location,
                date: event.startDate.toJSDate(),
                links: [{
                    color: '#00aaaa',
                    notificationColor: '#aaaa00',
                    href: event.location || '',
                    isDark: undefined,
                    logo: '',
                    name: event.summary || '',
                }],
            };
        });
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