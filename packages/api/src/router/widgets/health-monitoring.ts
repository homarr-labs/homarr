import { clusterInfoRequestHandler, systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getSystemHealthStatus: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get system health status (CPU, memory, disk, network) from NAS/server monitoring integrations. REQUIRED: integrationIds (array of TrueNAS/Unraid/Glances/OpenMediaVault/DashDot integration IDs from integration_all)",
      },
    })
    .concat(
      createManyIntegrationMiddleware("query", "openmediavault", "dashDot", "truenas", "unraid", "glances", "mock"),
    )
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data,
            updatedAt: timestamp,
          };
        }),
      );
    }),
  getClusterHealthStatus: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Proxmox cluster health status including nodes, VMs, and resource usage. REQUIRED: integrationId (single Proxmox integration ID from integration_all)",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "proxmox", "mock"))
    .query(async ({ ctx }) => {
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      const { data } = await innerHandler.getDataAsync();
      return data;
    }),
});
