import { tracearrRequestHandler } from "@homarr/request-handler/tracearr";
import { mockWidgetData } from "@homarr/integrations";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const tracearrRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "tracearr", "mock"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          if (integration.kind === "mock") {
            return {
              integrationId: integration.id,
              integrationName: integration.name,
              integrationUrl: integration.url,
              dashboard: mockWidgetData.tracearr,
              updatedAt: new Date(mockWidgetData.timestamp),
              error: undefined,
            };
          }
          const innerHandler = tracearrRequestHandler.handler({ ...integration, kind: "tracearr" }, {});
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
