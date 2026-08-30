import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { PatchMonStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const patchmonStatsRequestHandler = createIntegrationRequestHandler<
  PatchMonStats,
  "patchmon",
  Record<string, never>
>({
  cacheNamespace: "patchmon:stats",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
