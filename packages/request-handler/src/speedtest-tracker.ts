import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { SpeedtestTrackerDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const speedtestTrackerRequestHandler = createIntegrationRequestHandler<
  SpeedtestTrackerDashboardData,
  "speedtestTracker",
  Record<string, never>
>({
  cacheNamespace: "speedtest-tracker:dashboard",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
