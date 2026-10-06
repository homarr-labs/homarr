import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { WudStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const wudStatsRequestHandler = createIntegrationRequestHandler<WudStats, "wud", Record<string, never>>({
  cacheNamespace: "wud:stats",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
