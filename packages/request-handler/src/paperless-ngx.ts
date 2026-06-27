import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { PaperlessNgxStats } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const paperlessNgxStatsRequestHandler = createCachedIntegrationRequestHandler<
  PaperlessNgxStats,
  "paperlessNgx",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatsAsync();
  },
  cacheDuration: dayjs.duration(15, "minute"),
  queryKey: "paperless-ngx-stats",
});
