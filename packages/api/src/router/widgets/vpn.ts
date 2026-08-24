import { vpnSummaryHandler } from "@homarr/request-handler/vpn";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const vpnRouter = createTRPCRouter({
  getSummaries: publicProcedure
    .unstable_concat(createManyWidgetIntegrationMiddleware("query", "vpn"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const { data, timestamp } = await vpnSummaryHandler.handler(integration, {}).getDataAsync();
          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
            error: undefined,
          };
        },
        {
          fallback: (integration, error) => ({
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: new Date(0),
            },
            summary: null,
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
