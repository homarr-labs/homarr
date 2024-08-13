import { observable } from "@trpc/server/observable";

import type { DownloadClientJobsAndStatus, SanitizedIntegration } from "@homarr/integrations";
import { DownloadClientIntegration, downloadClientItemSchema, integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const _integrations = [
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  DownloadClientIntegration.DownloadClientKinds[0]!,
  ...DownloadClientIntegration.DownloadClientKinds.slice(1),
];

export const downloadsRouter = createTRPCRouter({
  getJobsAndStatuses: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("query", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async ({ decryptedSecrets: _, ...integration }) => {
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          const data = (await channel.getAsync())?.data ?? null;
          return {
            integration: integration as SanitizedIntegration,
            data,
          };
        }),
      );
    }),
  subscribeToJobsAndStatuses: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("query", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .subscription(({ ctx }) => {
      return observable<{ integration: SanitizedIntegration; data: DownloadClientJobsAndStatus }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          const unsubscribe = channel.subscribe((data) =>
            emit.next({
              integration,
              data,
            }),
          );
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
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
          await integrationInstance.pauseQueueAsync();
        }),
      );
    }),
  pauseItem: protectedProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
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
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = integrationCreatorByKind(integration.kind, integration);
          await integrationInstance.resumeQueueAsync();
        }),
      );
    }),
  resumeItem: protectedProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
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
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
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
