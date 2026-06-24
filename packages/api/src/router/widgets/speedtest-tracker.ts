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
          const { data, timestamp } = await innerHandler.getDataAsync();

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
});
