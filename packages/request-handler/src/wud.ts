import { createIntegrationAsync } from "@homarr/integrations";
import type { WudStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const wudStatsRequestHandler = createIntegrationRequestHandler<WudStats, "wud", Record<string, never>>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
