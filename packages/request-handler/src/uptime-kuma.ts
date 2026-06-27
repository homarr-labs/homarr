import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { UptimeKumaDashboardData } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const uptimeKumaRequestHandler = createCachedIntegrationRequestHandler<
  UptimeKumaDashboardData,
  "uptimeKuma",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "uptimeKumaDashboard",
});
