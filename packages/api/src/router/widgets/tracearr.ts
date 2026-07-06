import { tracearrRequestHandler } from "@homarr/request-handler/tracearr";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const tracearrRouter = createTRPCRouter({
  getDashboard: publicProcedure.concat(createManyIntegrationMiddleware("query", "tracearr")).query(async ({ ctx }) => {
    return await settleIntegrationQueries(ctx.integrations, async (integration) => {
      const innerHandler = tracearrRequestHandler.handler(integration, {});
      const { data, timestamp } = await innerHandler.getDataAsync();

      return {
        integrationId: integration.id,
        integrationName: integration.name,
        integrationUrl: integration.url,
        dashboard: data,
        updatedAt: timestamp,
      };
    });
  }),
});
