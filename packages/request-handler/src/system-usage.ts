import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { System } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const systemUsageRequestHandler = createCachedIntegrationRequestHandler<System, "beszel", { systemId: string }>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSystemDetailsAsync(input.systemId);
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "systemUsage",
});
