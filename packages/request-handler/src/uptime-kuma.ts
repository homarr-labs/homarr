import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { UptimeKumaDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const uptimeKumaRequestHandler = createIntegrationRequestHandler<
  UptimeKumaDashboardData,
  "uptimeKuma",
  Record<string, never>
>({
  cacheNamespace: "uptime-kuma:monitors",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
