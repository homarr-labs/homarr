import { createIntegrationAsync } from "@homarr/integrations";
import type { TracearrDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const tracearrRequestHandler = createIntegrationRequestHandler<
  TracearrDashboardData,
  "tracearr",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
