import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { CalendarEvent, RadarrReleaseType } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const calendarMonthRequestHandler = createCachedIntegrationRequestHandler<
  CalendarEvent[],
  IntegrationKindByCategory<"calendar">,
  { year: number; month: number; releaseType: RadarrReleaseType[] }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const startDate = dayjs().year(input.year).month(input.month).startOf("month");
    const endDate = startDate.clone().endOf("month");
    return await integrationInstance.getCalendarEventsAsync(startDate.toDate(), endDate.toDate());
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "calendarMonth",
});
