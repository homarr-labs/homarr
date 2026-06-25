import { createIntegrationAsync } from "@homarr/integrations";
import type { AudiobookshelfDashboardData } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const audiobookshelfRequestHandler = createIntegrationRequestHandler<
  AudiobookshelfDashboardData,
  "audiobookshelf",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
});
