import { TRPCError } from "@trpc/server";

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
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const client = await createIntegrationAsync(integration);
          await client.testAllAsync().catch((err) => {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to test all indexers for ${integration.name} (${integration.id})`,
              cause: err,
            });
          });
        }),
      );
    }),
});
