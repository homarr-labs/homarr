import { TRPCError } from "@trpc/server";

import { ProwlarrIntegration } from "@homarr/integrations";
import { logger } from "@homarr/log";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const indexerManagerRouter = createTRPCRouter({
  getIndexersStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "prowlarr"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          let client;
          switch (integration.kind) {
            case "prowlarr":
              client = new ProwlarrIntegration(integration);
              break;
          }

          const indexers = await client.getIndexersAsync().catch((err) => {
            logger.error("indexer-manager router - ", err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch indexers for ${integration.name} (${integration.id})`,
            });
          });

          return {
            integrationId: integration.id,
            integrationKind: integration.kind,
            indexers,
          };
        }),
      );
      return results;
    }),

  testAllIndexers: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("interact", "prowlarr"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          let client;
          switch (integration.kind) {
            case "prowlarr":
              client = new ProwlarrIntegration(integration);
              break;
          }
          await client.testAllAsync().catch((err) => {
            logger.error("indexer-manager router - ", err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to test all indexers for ${integration.name} (${integration.id})`,
            });
          });
        }),
      );
    }),
});
