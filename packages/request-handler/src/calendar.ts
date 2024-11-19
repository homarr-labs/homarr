import dayjs from "dayjs";

import type { Modify } from "@homarr/common/types";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { CalendarEvent, RadarrReleaseType } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const calendarMonthRequestHandler = createCachedIntegrationRequestHandler<
  CalendarEvent[],
  IntegrationKindByCategory<"calendar">,
  { year: number; month: number; releaseType: RadarrReleaseType[] }
>({
  async requestAsync(integration, input) {
    // TODO: remove conversion when missing integrations are added
    const integrationInstance = integrationCreator(
      integration as Modify<typeof integration, { kind: "radarr" | "sonarr" | "lidarr" }>,
    );
    const startDate = dayjs().year(input.year).month(input.month).startOf("month");
    const endDate = startDate.clone().endOf("month");
    return await integrationInstance.getCalendarEventsAsync(startDate.toDate(), endDate.toDate());
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "calendarMonth",
});
