import { JackettIndexerTestError } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import { indexerManagerRequestHandler } from "@homarr/request-handler/indexer-manager";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const indexerManagerRouter = createTRPCRouter({
  getIndexersStatus: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "indexerManager"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = indexerManagerRequestHandler.handler(integration, {});
          const { data: indexers } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            indexers,
            error: undefined,
          };
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            indexers: [],
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
  testAllIndexers: protectedProcedure
    .concat(createManyWidgetIntegrationMiddleware("interact", "indexerManager"))
    .mutation(async ({ ctx }) => {
      const results = await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const client = await createIntegrationAsync(integration);
          await client.testAllAsync();
          return { integrationId: integration.id, integrationName: integration.name, error: null };
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            error: error instanceof JackettIndexerTestError ? error.message : toPublicIntegrationError(error),
          }),
        },
      );
      await indexerManagerRequestHandler.invalidateCacheAsync(ctx.integrations.map(({ id }) => id));

      return results;
    }),
});
