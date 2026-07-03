import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { NetworkControllerSummary } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const networkControllerRequestHandler = createIntegrationRequestHandler<
  NetworkControllerSummary,
  IntegrationKindByCategory<"networkController">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getNetworkSummaryAsync();
  },
});
