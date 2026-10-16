import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { SystemHealthMonitoring } from "@homarr/integrations";
import { healthMonitoringClusterIntegrationKinds, healthMonitoringSystemIntegrationKinds } from "@homarr/definitions";
import { clusterInfoRequestHandler, systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createApiRouter, publicProcedure } from "../../procedure";

interface SystemHealthQueryResult {
  integrationId: string;
  integrationName: string;
  healthInfo: SystemHealthMonitoring | null;
  updatedAt?: Date;
  error?: string;
}

export const healthMonitoringRouter = createApiRouter({
  getSystemHealthStatus: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get system health status (CPU, memory, disk, network) from NAS/server monitoring integrations. REQUIRED: integrationIds (array of TrueNAS/Synology/Unraid/Glances/OpenMediaVault/DashDot integration IDs from integration_all)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...healthMonitoringSystemIntegrationKinds))
    .query(async ({ context }) => {
      return await settleIntegrationQueries<(typeof context.integrations)[number], SystemHealthQueryResult>(
        context.integrations,
        async (integration) => {
          const { data, timestamp } = await systemInfoRequestHandler.handler(integration, {}).getDataAsync();
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data,
            updatedAt: timestamp,
          };
        },
        {
          fallback: (integration) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: null,
            error: PUBLIC_INTEGRATION_ERROR,
          }),
          throwOnAllFailures: true,
        },
      );
    }),
  listStorageVolumes: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List storage volumes from a Synology DiskStation or OpenMediaVault integration for widget configuration. REQUIRED: integrationId from integration_all (Synology or OpenMediaVault integration only). The caller needs query permission for that integration.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "synology", "openmediavault"))
    .query(async ({ context }) => {
      const integrationInstance = await createIntegrationAsync(context.integration);
      return await integrationInstance.listStorageVolumesAsync();
    }),
  getClusterHealthStatus: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Proxmox cluster health status including nodes, VMs, and resource usage. REQUIRED: integrationId (single Proxmox integration ID from integration_all)",
      },
    })
    .concat(createOneIntegrationMiddleware("query", ...healthMonitoringClusterIntegrationKinds))
    .query(async ({ context }) => {
      const innerHandler = clusterInfoRequestHandler.handler(context.integration, {});
      const { data } = await innerHandler.getDataAsync();
      return data;
    }),
});
