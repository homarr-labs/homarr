import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { vpnSummaryHandler } from "@homarr/request-handler/vpn";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const vpnRouter = createTRPCRouter({
  getSummaries: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("vpn")))
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
            summary: data as typeof data | null,
            error: undefined as string | undefined,
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
            error: error instanceof Error ? error.message : String(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
