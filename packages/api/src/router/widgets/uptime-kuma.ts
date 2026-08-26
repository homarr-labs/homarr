import { uptimeKumaRequestHandler } from "@homarr/request-handler/uptime-kuma";
import { mockWidgetData } from "@homarr/integrations";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const uptimeKumaRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "uptimeKuma", "mock"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          if (integration.kind === "mock") {
            return {
              integrationId: integration.id,
              integrationName: integration.name,
              integrationUrl: integration.url,
              dashboard: mockWidgetData.uptimeKuma,
              updatedAt: new Date(mockWidgetData.timestamp),
              error: undefined,
            };
          }
          const innerHandler = uptimeKumaRequestHandler.handler({ ...integration, kind: "uptimeKuma" }, {});
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
