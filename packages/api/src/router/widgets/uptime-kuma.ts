import { observable } from "@trpc/server/observable";

import type { UptimeKumaDashboardData } from "@homarr/integrations/types";
import { uptimeKumaRequestHandler } from "@homarr/request-handler/uptime-kuma";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const uptimeKumaRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "uptimeKuma"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = uptimeKumaRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            dashboard: data,
            updatedAt: timestamp,
          };
        }),
      );

      return results;
    }),

  subscribeToDashboard: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "uptimeKuma"))
    .subscription(({ ctx }) => {
      return observable<{
        integrationId: string;
        dashboard: UptimeKumaDashboardData;
        timestamp: Date;
      }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = uptimeKumaRequestHandler.handler(integration, {});
          return innerHandler.subscribe((dashboard) => {
            emit.next({
              integrationId: integration.id,
              dashboard,
              timestamp: new Date(),
            });
          });
        });

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      });
    }),
});
