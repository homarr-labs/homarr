import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { ProxmoxClusterInfo, SystemHealthMonitoring } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const systemInfoRequestHandler = createIntegrationRequestHandler<
  SystemHealthMonitoring,
  Exclude<IntegrationKindByCategory<"healthMonitoring">, "proxmox" | "coolify" | "beszel" | "patchmon">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSystemInfoAsync();
  },
  cacheTtlMs: 5_000,
});

export const clusterInfoRequestHandler = createIntegrationRequestHandler<
  ProxmoxClusterInfo,
  "proxmox" | "mock",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClusterInfoAsync();
  },
  cacheTtlMs: 5_000,
});
