import { observable } from "@trpc/server/observable";

import type { TracearrDashboardData } from "@homarr/integrations/types";
import { tracearrRequestHandler } from "@homarr/request-handler/tracearr";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const tracearrRouter = createTRPCRouter({
  getDashboard: publicProcedure.concat(createManyIntegrationMiddleware("query", "tracearr")).query(async ({ ctx }) => {
    const results = await Promise.all(
      ctx.integrations.map(async (integration) => {
        const innerHandler = tracearrRequestHandler.handler(integration, {});
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
    .concat(createManyIntegrationMiddleware("query", "tracearr"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; dashboard: TracearrDashboardData; timestamp: Date }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = tracearrRequestHandler.handler(integration, {});
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
