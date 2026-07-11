import { createIntegrationAsync } from "@homarr/integrations";
import type { PaperlessNgxStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const paperlessNgxStatsRequestHandler = createIntegrationRequestHandler<
  PaperlessNgxStats,
  "paperlessNgx",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
});
