import { upsSummariesRequestHandler } from "@homarr/request-handler/ups";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const upsRouter = createTRPCRouter({
  getSummaries: publicProcedure.concat(createManyWidgetIntegrationMiddleware("query", "ups")).query(async ({ ctx }) => {
    return await settleIntegrationQueries(
      ctx.integrations,
      async (integration) => {
        const innerHandler = upsSummariesRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          summaries: data,
          updatedAt: timestamp,
          error: undefined as string | undefined,
        };
      },
      {
        fallback: (integration, error) => ({
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          summaries: [],
          updatedAt: new Date(0),
          error: toPublicIntegrationError(error),
        }),
        throwOnAllFailures: true,
      },
    );
  }),
});
