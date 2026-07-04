import { createIntegrationAsync } from "@homarr/integrations";
import type { BazarrBadges } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const bazarrBadgesRequestHandler = createIntegrationRequestHandler<
  BazarrBadges,
  "bazarr",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getBadgesAsync();
  },
});
