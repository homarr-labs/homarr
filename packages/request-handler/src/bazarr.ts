import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { BazarrBadges } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const bazarrBadgesRequestHandler = createIntegrationRequestHandler<
  BazarrBadges,
  "bazarr",
  Record<string, never>
>({
  cacheNamespace: "bazarr:badges",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getBadgesAsync();
  },
});
