import { ApiError } from "../../procedure";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import { indexerManagerRequestHandler } from "@homarr/request-handler/indexer-manager";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createApiRouter, protectedProcedure, publicProcedure } from "../../procedure";

export const indexerManagerRouter = createApiRouter({
  getIndexersStatus: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "indexerManager"))
    .query(async ({ context }) => {
      return await settleIntegrationQueries(
        context.integrations,
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
    .mutation(async ({ context }) => {
      const results = await Promise.allSettled(
        context.integrations.map(async (integration) => {
          const client = await createIntegrationAsync(integration);
          await client.testAllAsync().catch((err) => {
            throw new ApiError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to test all indexers for ${integration.name} (${integration.id})`,
              cause: err,
            });
          });
        }),
      );
      await indexerManagerRequestHandler.invalidateCacheAsync(context.integrations.map(({ id }) => id));

      const firstFailure = results.find((result) => result.status === "rejected");
      if (firstFailure?.status === "rejected") throw firstFailure.reason;
    }),
});
