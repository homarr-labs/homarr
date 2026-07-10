import { createIntegrationAsync } from "@homarr/integrations";
import type { UptimeKumaDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const uptimeKumaRequestHandler = createIntegrationRequestHandler<
  UptimeKumaDashboardData,
  "uptimeKuma",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
