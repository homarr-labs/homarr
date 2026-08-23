import { getWidgetServerCachePolicy } from "@homarr/definitions";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations/factory";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const downloadsCachePolicy = getWidgetServerCachePolicy("downloads", "getJobsAndStatuses");

export const downloadClientRequestHandler = createIntegrationRequestHandler<
  DownloadClientJobsAndStatus,
  IntegrationKindByCategory<"downloadClient">,
  { limit: number }
>({
  cachePolicy: downloadsCachePolicy,
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClientJobsAndStatusAsync(input);
  },
});
