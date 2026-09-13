import { createIntegrationAsync } from "@homarr/integrations";
import type { HermesAgentOverview } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const hermesAgentRequestHandler = createIntegrationRequestHandler<
  HermesAgentOverview,
  "hermesAgent",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getOverviewAsync();
  },
  cacheTtlMs: 30_000,
});
