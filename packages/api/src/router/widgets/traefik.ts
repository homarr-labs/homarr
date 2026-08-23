import { traefikRequestHandler } from "@homarr/request-handler/traefik";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const traefikRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Retrieve Traefik dashboard data, including routers, services, middlewares, and entry points, for the given integration IDs.",
      },
    })
    .concat(createManyWidgetIntegrationMiddleware("query", "traefik"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = traefikRequestHandler.handler(integration, {});
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
