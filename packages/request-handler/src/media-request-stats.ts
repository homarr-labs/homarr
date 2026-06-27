import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRequestStats } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaRequestStatsRequestHandler = createIntegrationRequestHandler<
  MediaRequestStats,
  IntegrationKindByCategory<"mediaRequest">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return {
      stats: await integrationInstance.getStatsAsync(),
      users: await integrationInstance.getUsersAsync(),
    };
  },
});
