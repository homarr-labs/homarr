import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { ProxmoxClusterInfo, SystemHealthMonitoring } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const systemInfoRequestHandler = createIntegrationRequestHandler<
  SystemHealthMonitoring,
  Exclude<IntegrationKindByCategory<"healthMonitoring">, "proxmox" | "coolify" | "beszel" | "patchmon" | "wud">,
  Record<string, never>
>({
  cacheNamespace: "health-monitoring:system-info",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSystemInfoAsync();
  },
});

export const clusterInfoRequestHandler = createIntegrationRequestHandler<
  ProxmoxClusterInfo,
  "proxmox" | "mock",
  Record<string, never>
>({
  cacheNamespace: "health-monitoring:cluster-info",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClusterInfoAsync();
  },
});
