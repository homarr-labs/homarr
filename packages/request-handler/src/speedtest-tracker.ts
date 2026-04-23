import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations/create";
import type { SpeedtestTrackerDashboardData } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const speedtestTrackerRequestHandler = createCachedIntegrationRequestHandler<
  SpeedtestTrackerDashboardData,
  "speedtestTracker",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
  cacheDuration: dayjs.duration(10, "minutes"),
  queryKey: "speedtestTrackerDashboard",
});
