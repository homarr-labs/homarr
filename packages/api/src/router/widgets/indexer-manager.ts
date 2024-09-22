import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { Indexer } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createIndexerManagerIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("indexerManager"));

export const indexerManagerRouter = createTRPCRouter({
  getIndexersStatus: publicProcedure
    .unstable_concat(createIndexerManagerIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const client = integrationCreator(integration);
          const indexers = await client.getIndexersAsync().catch((err) => {
            logger.error("indexer-manager router - ", err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch indexers for ${integration.name} (${integration.id})`,
            });
          });

          return {
            integrationId: integration.id,
            indexers,
          };
        }),
      );
      return results;
    }),

  subscribeIndexersStatus: publicProcedure
    .unstable_concat(createIndexerManagerIntegrationMiddleware("query"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; indexers: Indexer[] }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const channel = createItemAndIntegrationChannel<Indexer[]>("indexerManager", integration.id);
          const unsubscribe = channel.subscribe((indexers) => {
            emit.next({
              integrationId: integration.id,
              indexers,
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
          });
        };
      });
    }),

  testAllIndexers: publicProcedure
    .unstable_concat(createIndexerManagerIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const client = integrationCreator(integration);
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
