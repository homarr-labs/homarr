import { createIntegrationAsync } from "@homarr/integrations";
import type { LlamacppStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const llamacppStatsRequestHandler = createIntegrationRequestHandler<
  LlamacppStats,
  "llamacpp",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
