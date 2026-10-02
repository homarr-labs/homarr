import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { VpnSummary } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const vpnSummaryHandler = createIntegrationRequestHandler<
  VpnSummary,
  IntegrationKindByCategory<"vpn">,
  Record<string, never>
>({
  cacheNamespace: "vpn:summary",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSummaryAsync();
  },
});
