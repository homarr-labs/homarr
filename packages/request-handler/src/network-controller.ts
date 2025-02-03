import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { NetworkControllerSummary } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const networkControllerRequestHandler = createCachedIntegrationRequestHandler<
  NetworkControllerSummary,
  IntegrationKindByCategory<"networkController">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreator(integration);
    return await integrationInstance.getNetworkSummaryAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "networkControllerSummary",
});
