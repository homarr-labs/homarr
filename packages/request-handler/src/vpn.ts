import dayjs from "dayjs";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { VpnSummary } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

const logger = createLogger({ module: "vpnRequestHandler" });

export const vpnSummaryHandler = createCachedIntegrationRequestHandler<
  VpnSummary | null,
  IntegrationKindByCategory<"vpn">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    try {
      const integrationInstance = await createIntegrationAsync(integration);
      return await integrationInstance.getSummaryAsync();
    } catch (error) {
      // The VPN control server is unreachable (e.g. the container is down).
      // Return null so the widget can render an "unavailable" status instead of
      // surfacing a hard error, and so it recovers automatically once it is back up.
      logger.warn("Failed to fetch VPN summary, marking as unavailable", {
        integrationId: integration.id,
        integrationKind: integration.kind,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "vpnSummary",
});
