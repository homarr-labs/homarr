import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/create";
import type { Station, Timetable } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const timetableSearchStationsRequestHandler = createCachedIntegrationRequestHandler<
  Station[],
  IntegrationKindByCategory<"timetable">,
  { query: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.searchStationsAsync(input.query);
  },
  queryKey: "timetableSearchStations",
  cacheDuration: dayjs.duration(1, "day"),
});

export const timetableGetTimetableRequestHandler = createCachedIntegrationRequestHandler<
  Timetable,
  IntegrationKindByCategory<"timetable">,
  { stationId: string; limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getTimetableAsync({
      stationId: input.stationId,
      limit: input.limit,
    });
  },
  queryKey: "timetableGetTimetable",
  cacheDuration: dayjs.duration(1, "minute"),
});
