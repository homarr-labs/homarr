import { observable } from "@trpc/server/observable";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus, SanitizedIntegration } from "@homarr/integrations";
import { downloadClientItemSchema, integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const integrations = getIntegrationKindsByCategory("downloadClient");                                     // @Meierschlumpf
const createDownloadClientIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, "" as (typeof integrations)[number], ...integrations);          // <- lmfao that works
// createManyIntegrationMiddleware(action, "sabNzbd", "nzbGet", "deluge", "transmission", "qBittorrent"); // <- Normal way
// createManyIntegrationMiddleware(action, integrations.shift()!, ...integrations);                       // <- Doesn't even work actually
// createManyIntegrationMiddleware(action, integrations)                                                  // <- What I want
// createManyIntegrationMiddleware(action, ...integrations)                                               // <- Would also work with me

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
      return observable<{ integration: SanitizedIntegration; timestamp: Date; data: DownloadClientJobsAndStatus }>(
        (emit) => {
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
        },
      );
    }),
  pause: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
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
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
          await integrationInstance.pauseItemAsync(input.item);
        }),
      );
    }),
  resume: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
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
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
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
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
          await integrationInstance.deleteItemAsync(input.item, input.fromDisk);
        }),
      );
    }),
});
