import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { AudiobookshelfDashboardData } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const audiobookshelfRequestHandler = createCachedIntegrationRequestHandler<
  AudiobookshelfDashboardData,
  "audiobookshelf",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardDataAsync();
  },
  cacheDuration: dayjs.duration(10, "minutes"),
  queryKey: "audiobookshelfDashboard",
});
