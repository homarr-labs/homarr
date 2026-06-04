import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { UpsSummary } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const upsSummariesRequestHandler = createCachedIntegrationRequestHandler<
  UpsSummary[],
  IntegrationKindByCategory<"ups">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getUpsSummariesAsync();
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "upsSummaries",
});
