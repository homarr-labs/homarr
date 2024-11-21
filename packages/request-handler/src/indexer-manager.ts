import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { Indexer } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const indexerManagerRequestHandler = createCachedIntegrationRequestHandler<
  Indexer[],
  IntegrationKindByCategory<"indexerManager">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreator(integration);
    return await integrationInstance.getIndexersAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "indexerManager",
});
