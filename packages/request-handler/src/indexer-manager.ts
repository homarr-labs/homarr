import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { Indexer } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const indexerManagerRequestHandler = createIntegrationRequestHandler<
  Indexer[],
  IntegrationKindByCategory<"indexerManager">,
  Record<string, never>
>({
  cacheNamespace: "indexer-manager:indexers",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getIndexersAsync();
  },
});
