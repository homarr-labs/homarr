import { observable } from "@trpc/server/observable";

import type { SpeedtestTrackerDashboardData } from "@homarr/integrations/types";
import { speedtestTrackerRequestHandler } from "@homarr/request-handler/speedtest-tracker";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const speedtestTrackerRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "speedtestTracker"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = speedtestTrackerRequestHandler.handler(integration, {});
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
    .concat(createManyIntegrationMiddleware("query", "speedtestTracker"))
    .subscription(({ ctx }) => {
      return observable<{
        integrationId: string;
        dashboard: SpeedtestTrackerDashboardData;
        timestamp: Date;
      }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = speedtestTrackerRequestHandler.handler(integration, {});
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
