import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { LlamacppStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const llamacppStatsRequestHandler = createIntegrationRequestHandler<
  LlamacppStats,
  "llamacpp",
  Record<string, never>
>({
  cacheNamespace: "llamacpp:stats",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
