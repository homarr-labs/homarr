import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const downloadClientRequestHandler = createCachedIntegrationRequestHandler<
  DownloadClientJobsAndStatus,
  IntegrationKindByCategory<"downloadClient">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClientJobsAndStatusAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "downloadClientJobStatus",
});
