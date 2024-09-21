import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import type { HealthMonitoring} from "@homarr/integrations";
import { integrationCreator } from "@homarr/integrations";
import { logger } from "@homarr/log";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const client = integrationCreator(integration);

          try {
            const healthInfo = await client.getSystemInfoAsync();
            return {
              integrationId: integration.id,
              healthInfo,
            };
          } catch (err) {
            logger.error(`Error fetching health info for ${integration.name} (${integration.id}) - `, err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch health info for ${integration.name} (${integration.id})`,
            });
          }
        }),
      );
      return results;
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
