import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { NavidromeDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const navidromeRequestHandler = createIntegrationRequestHandler<
  NavidromeDashboardData,
  "navidrome",
  Record<string, never>
>({
  cacheNamespace: "navidrome:dashboard",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
