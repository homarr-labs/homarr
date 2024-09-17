import { observable } from "@trpc/server/observable";

import type { Integration } from "@homarr/db/schema/sqlite";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { downloadClientItemSchema, integrationCreator } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const createDownloadClientIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("downloadClient"));

export const downloadsRouter = createTRPCRouter({
  getJobsAndStatuses: publicProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async ({ decryptedSecrets: _, ...integration }) => {
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          const { data, timestamp } = (await channel.getAsync()) ?? { data: null, timestamp: new Date(0) };
          return {
            integration,
            timestamp,
            data,
          };
        }),
      );
    }),
  subscribeToJobsAndStatuses: publicProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("query"))
    .subscription(({ ctx }) => {
      return observable<{ integration: Integration; timestamp: Date; data: DownloadClientJobsAndStatus }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          const unsubscribe = channel.subscribe((data) => {
            emit.next({
              integration,
              timestamp: new Date(),
              data,
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
  pause: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreator(integration);
          await integrationInstance.pauseQueueAsync();
        }),
      );
    }),
  pauseItem: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .input(z.object({ item: downloadClientItemSchema }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreator(integration);
          await integrationInstance.pauseItemAsync(input.item);
        }),
      );
    }),
  resume: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreator(integration);
          await integrationInstance.resumeQueueAsync();
        }),
      );
    }),
  resumeItem: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .input(z.object({ item: downloadClientItemSchema }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreator(integration);
          await integrationInstance.resumeItemAsync(input.item);
        }),
      );
    }),
  deleteItem: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .input(z.object({ item: downloadClientItemSchema, fromDisk: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreator(integration);
          await integrationInstance.deleteItemAsync(input.item, input.fromDisk);
        }),
      );
    }),
});
