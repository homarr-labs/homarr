import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { HealthMonitoring, ProxmoxClusterInfo } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const systemInfoRequestHandler = createCachedIntegrationRequestHandler<
  HealthMonitoring,
  Exclude<IntegrationKindByCategory<"healthMonitoring">, "proxmox">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSystemInfoAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "systemInfo",
});

export const clusterInfoRequestHandler = createCachedIntegrationRequestHandler<
  ProxmoxClusterInfo,
  "proxmox",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getClusterInfoAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "clusterInfo",
});
