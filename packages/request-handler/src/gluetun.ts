import dayjs from "dayjs";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import type { GluetunStatusInfo } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

const logger = createLogger({ module: "gluetunRequestHandler" });

export const gluetunVPNStatusHandler = createCachedIntegrationRequestHandler<
  GluetunStatusInfo | null,
  "gluetun",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    try {
      const integrationInstance = await createIntegrationAsync(integration);
      return await integrationInstance.getVpnDetailsAsync();
    } catch (error) {
      // The gluetun control server is unreachable (e.g. the container is down).
      // Return null so the widget can render an "unavailable" status instead of
      // surfacing a hard error, and so it recovers automatically once it is back up.
      logger.warn("Failed to fetch gluetun VPN status, marking as unavailable", {
        integrationId: integration.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "gluetunInfo",
});
