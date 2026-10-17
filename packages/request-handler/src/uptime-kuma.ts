import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { UptimeKumaStatusPage } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const uptimeKumaRequestHandler = createIntegrationRequestHandler<
  UptimeKumaStatusPage,
  "uptimeKuma",
  Record<string, never>
>({
  cacheNamespace: "uptime-kuma:status-page",
  cacheTtlMs: 30_000,
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatusPageAsync();
  },
});
