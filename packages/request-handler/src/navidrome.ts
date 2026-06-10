import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { NavidromeDashboardData } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const navidromeRequestHandler = createCachedIntegrationRequestHandler<
  NavidromeDashboardData,
  "navidrome",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
  cacheDuration: dayjs.duration(10, "minutes"),
  queryKey: "navidromeDashboard",
});
