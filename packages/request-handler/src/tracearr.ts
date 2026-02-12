import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { TracearrDashboardData } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const tracearrRequestHandler = createCachedIntegrationRequestHandler<
  TracearrDashboardData,
  "tracearr",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "tracearrDashboard",
});
