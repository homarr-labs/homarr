import { observable } from "@trpc/server/observable";

import type { HealthMonitoring } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const channel = createItemAndIntegrationChannel<HealthMonitoring>("healthMonitoring", integration.id);
          const data = await channel.getAsync();
          if (!data) {
            return null;
          }

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data.data,
          };
        }),
      );
    }),

  subscribeHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; healthInfo: HealthMonitoring }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const channel = createItemAndIntegrationChannel<HealthMonitoring>("healthMonitoring", integration.id);
          const unsubscribe = channel.subscribe((healthInfo) => {
            emit.next({
              integrationId: integration.id,
              healthInfo,
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
