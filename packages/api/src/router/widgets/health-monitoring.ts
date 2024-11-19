import { observable } from "@trpc/server/observable";

import type { HealthMonitoring } from "@homarr/integrations";
import { systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
          const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data,
          };
        }),
      );
    }),

  subscribeHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
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
});
