import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { upsSummariesRequestHandler } from "@homarr/request-handler/ups";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const upsRouter = createTRPCRouter({
  getSummaries: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("ups")))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = upsSummariesRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          summaries: data,
          updatedAt: timestamp,
        };
      });
    }),
});
