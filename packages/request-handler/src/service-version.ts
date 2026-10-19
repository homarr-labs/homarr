import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { ServiceVersion } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const serviceVersionRequestHandler = createIntegrationRequestHandler<
  ServiceVersion,
  IntegrationKindByCategory<"serviceVersion">,
  Record<string, never>
>({
  cacheNamespace: "service-version:status",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServiceVersionAsync();
  },
});
