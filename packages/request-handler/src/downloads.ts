import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const downloadClientRequestHandler = createIntegrationRequestHandler<
  DownloadClientJobsAndStatus,
  IntegrationKindByCategory<"downloadClient">,
  { limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClientJobsAndStatusAsync(input);
  },
});
