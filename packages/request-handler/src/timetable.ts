import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { Station, Timetable } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const timetableSearchStationsRequestHandler = createIntegrationRequestHandler<
  Station[],
  IntegrationKindByCategory<"timetable">,
  { query: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.searchStationsAsync(input.query);
  },
});

export const timetableGetTimetableRequestHandler = createIntegrationRequestHandler<
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
});
