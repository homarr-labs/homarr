import { tracearrRequestHandler } from "@homarr/request-handler/tracearr";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const tracearrRouter = createTRPCRouter({
  getDashboard: publicProcedure.concat(createManyIntegrationMiddleware("query", "tracearr")).query(async ({ ctx }) => {
    return await settleIntegrationQueries(
      ctx.integrations,
      async (integration) => {
        const innerHandler = tracearrRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          dashboard: data as typeof data | null,
          updatedAt: timestamp,
          error: undefined as string | undefined,
        };
      },
      {
        fallback: (integration, error) => ({
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          dashboard: null,
          updatedAt: new Date(0),
          error: toPublicIntegrationError(error),
        }),
        throwOnAllFailures: true,
      },
    );
  }),
});
