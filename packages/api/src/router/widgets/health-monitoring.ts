import { observable } from "@trpc/server/observable";

import type { HealthMonitoring } from "@homarr/integrations";
import type { ProxmoxClusterInfo } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { clusterInfoRequestHandler, systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getSystemHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault", "dashDot"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data,
            updatedAt: timestamp,
          };
        }),
      );
    }),
  subscribeSystemHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault", "dashDot"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; healthInfo: HealthMonitoring; timestamp: Date }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
          const unsubscribe = innerHandler.subscribe((healthInfo) => {
            emit.next({
              integrationId: integration.id,
              healthInfo,
              timestamp: new Date(),
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
          });
        };
      });
    }),
  getClusterHealthStatus: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "proxmox"))
    .query(async ({ ctx }) => {
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),
  subscribeClusterHealthStatus: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "proxmox"))
    .subscription(({ ctx }) => {
      return observable<ProxmoxClusterInfo>((emit) => {
        const unsubscribes: (() => void)[] = [];
        const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
        const unsubscribe = innerHandler.subscribe((healthInfo) => {
          emit.next(healthInfo);
        });
        unsubscribes.push(unsubscribe);
        return () => {
          unsubscribe();
        };
      });
    }),
});
