import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { UptimeKumaStatusPage } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const uptimeKumaRequestHandler = createIntegrationRequestHandler<
  UptimeKumaStatusPage,
  "uptimeKuma",
  { statusPageSlug?: string }
>({
  cacheNamespace: "uptime-kuma:status-page",
  cacheVersion: "stale-status-v1",
  cacheTtlMs: 30_000,
  async requestAsync(integration, input, signal) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatusPageAsync(signal, input.statusPageSlug);
  },
});
