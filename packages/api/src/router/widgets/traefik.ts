import { traefikRequestHandler } from "@homarr/request-handler/traefik";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
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
    .concat(createManyIntegrationMiddleware("query", "traefik"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = traefikRequestHandler.handler(integration, {});
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
