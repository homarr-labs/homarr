import { createIntegrationAsync } from "@homarr/integrations";
import type { PatchMonStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const patchmonStatsRequestHandler = createIntegrationRequestHandler<
  PatchMonStats,
  "patchmon",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
