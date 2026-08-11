import { createIntegrationAsync } from "@homarr/integrations";
import type { KomodoOverview, KomodoServerOverviewItem } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const komodoOverviewRequestHandler = createIntegrationRequestHandler<
  KomodoOverview,
  "komodo",
  Record<string, never>
>({
  cacheTtlMs: 5_000,
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getOverviewAsync();
  },
});

export const komodoServerOverviewRequestHandler = createIntegrationRequestHandler<
  KomodoServerOverviewItem[],
  "komodo",
  Record<string, never>
>({
  cacheTtlMs: 5_000,
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServerOverviewAsync();
  },
});
