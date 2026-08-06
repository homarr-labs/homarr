import { createIntegrationAsync } from "@homarr/integrations";
import type { TraefikDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const traefikRequestHandler = createIntegrationRequestHandler<
  TraefikDashboardData,
  "traefik",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
