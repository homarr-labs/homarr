import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { CalendarEvent, RadarrReleaseType } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const calendarMonthRequestHandler = createIntegrationRequestHandler<
  CalendarEvent[],
  IntegrationKindByCategory<"calendar">,
  { year: number; month: number; releaseType: RadarrReleaseType[]; showUnmonitored: boolean }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    // Calendar component shows up to 6 days before and after the month, for example if 1. of january is sunday, it shows the last 6 days of december.
    const startDate = dayjs().year(input.year).month(input.month).startOf("month").subtract(6, "days");
    const endDate = dayjs().year(input.year).month(input.month).endOf("month").add(6, "days");

    return await integrationInstance.getCalendarEventsAsync(
      startDate.toDate(),
      endDate.toDate(),
      input.showUnmonitored,
    );
  },
});
