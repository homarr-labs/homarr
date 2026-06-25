import { createIntegrationAsync } from "@homarr/integrations";
import type { NavidromeDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const navidromeRequestHandler = createIntegrationRequestHandler<
  NavidromeDashboardData,
  "navidrome",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
