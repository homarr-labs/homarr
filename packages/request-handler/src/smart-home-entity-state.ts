import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const smartHomeEntityStateRequestHandler = createIntegrationRequestHandler<
  string,
  IntegrationKindByCategory<"smartHomeServer">,
  { entityId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const result = await integrationInstance.getEntityStateAsync(input.entityId);

    if (!result.success) {
      throw new Error(`Unable to fetch data from Home Assistant error='${result.error as string}'`);
    }

    return result.data.state;
  },
});
