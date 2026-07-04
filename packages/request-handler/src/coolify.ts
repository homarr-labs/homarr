import { createIntegrationAsync } from "@homarr/integrations";
import type { CoolifyInstanceInfo } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const coolifyRequestHandler = createIntegrationRequestHandler<
  CoolifyInstanceInfo,
  "coolify",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getInstanceInfoAsync();
  },
});
