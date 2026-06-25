import { TRPCError } from "@trpc/server";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { indexerManagerRequestHandler } from "@homarr/request-handler/indexer-manager";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const createIndexerManagerIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("indexerManager"));

export const indexerManagerRouter = createTRPCRouter({
  getIndexersStatus: publicProcedure
    .concat(createIndexerManagerIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = indexerManagerRequestHandler.handler(integration, {});
        const { data: indexers } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          indexers,
        };
      });
    }),
  testAllIndexers: protectedProcedure
    .concat(createIndexerManagerIntegrationMiddleware("interact"))
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
