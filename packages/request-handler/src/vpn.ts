import { createLogger } from "@homarr/core/infrastructure/logs";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { VpnSummary } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const logger = createLogger({ module: "vpnRequestHandler" });

export const vpnSummaryHandler = createIntegrationRequestHandler<
  VpnSummary | null,
  IntegrationKindByCategory<"vpn">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    try {
      const integrationInstance = await createIntegrationAsync(integration);
      return await integrationInstance.getSummaryAsync();
    } catch (error) {
      logger.warn("Failed to fetch VPN summary, marking as unavailable", {
        integrationId: integration.id,
        integrationKind: integration.kind,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
});
