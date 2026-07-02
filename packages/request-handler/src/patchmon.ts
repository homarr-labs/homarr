import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { PatchMonStats } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const patchmonStatsRequestHandler = createCachedIntegrationRequestHandler<
  PatchMonStats,
  "patchmon",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
  cacheDuration: dayjs.duration(15, "minute"),
  queryKey: "patchmon-stats",
});
