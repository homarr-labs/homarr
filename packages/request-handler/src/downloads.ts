import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { integrationCreator } from "@homarr/integrations";

import { createCachedRequestHandler } from "./lib/cached-request-handler";

export const downloadClientRequestHandler = createCachedRequestHandler<
  DownloadClientJobsAndStatus,
  IntegrationKindByCategory<"downloadClient">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreator(integration);
    return await integrationInstance.getClientJobsAndStatusAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "downloadClientJobStatus",
});
