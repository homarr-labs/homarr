import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { GluetunStatusInfo } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const gluetunVPNStatusHandler = createCachedIntegrationRequestHandler<
  GluetunStatusInfo,
  "gluetun",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getVpnDetailsAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "gluetunInfo",
});
