import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { CalendarEvent, RadarrReleaseType } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const getCalendarMonthRange = (year: number, month: number) => {
  const zeroBasedMonth = month - 1;
  return {
    startDate: dayjs().year(year).month(zeroBasedMonth).startOf("month").subtract(6, "days").toDate(),
    endDate: dayjs().year(year).month(zeroBasedMonth).endOf("month").add(6, "days").toDate(),
  };
};

export const calendarMonthRequestHandler = createIntegrationRequestHandler<
  CalendarEvent[],
  IntegrationKindByCategory<"calendar">,
  { year: number; month: number; releaseType: RadarrReleaseType[]; showUnmonitored: boolean }
>({
  cacheNamespace: "calendar:month",
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    // Calendar component shows up to 6 days before and after the month, for example if 1. of january is sunday, it shows the last 6 days of december.
    const { startDate, endDate } = getCalendarMonthRange(input.year, input.month);

    return await integrationInstance.getCalendarEventsAsync(startDate, endDate, input.showUnmonitored);
  },
});
