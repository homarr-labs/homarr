import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import type { IntegrationKind } from "@homarr/definitions";
import type { DownloadClientIntegration, IntegrationInput, SanitizedIntegration } from "@homarr/integrations";
import { integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import type { DownloadClientJobsAndStatus } from "../../../../integrations/src/interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../../../integrations/src/interfaces/downloads/download-client-items";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const downloadsRouter = createTRPCRouter({
  getJobsAndStatuses: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("query", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async ({ decryptedSecrets: _, ...integration }) => {
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          const data = await channel.getAsync();
          return {
            integration: integration as SanitizedIntegration,
            data: data?.data ?? ({} as DownloadClientJobsAndStatus),
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
          const unsubscribe = channel.subscribe((sessions) => {
            emit.next({
              integration: integration as SanitizedIntegration,
              data: sessions,
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
  pause: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = getIntegrationInstance(integration.kind, integration);
          await integrationInstance.pauseQueueAsync();
        }),
      );
    }),
  pauseItem: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .input(z.object({ item: z.any() satisfies z.ZodType<DownloadClientItem> }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = getIntegrationInstance(integration.kind, integration);
          await integrationInstance.pauseItemAsync(input.item as DownloadClientItem);
        }),
      );
    }),
  resume: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = getIntegrationInstance(integration.kind, integration);
          await integrationInstance.resumeQueueAsync();
        }),
      );
    }),
  resumeItem: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .input(z.object({ item: z.any() satisfies z.ZodType<DownloadClientItem> }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = getIntegrationInstance(integration.kind, integration);
          await integrationInstance.resumeItemAsync(input.item as DownloadClientItem);
        }),
      );
    }),
  deleteItem: publicProcedure
    .unstable_concat(
      createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"),
    )
    .input(z.object({ item: z.any() satisfies z.ZodType<DownloadClientItem>, fromDisk: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = getIntegrationInstance(integration.kind, integration);
          await integrationInstance.deleteItemAsync(input.item as DownloadClientItem, input.fromDisk);
        }),
      );
    }),
});

function getIntegrationInstance(kind: IntegrationKind, integration: IntegrationInput): DownloadClientIntegration {
  switch (kind) {
    case "sabNzbd":
    case "nzbGet":
    case "qBittorrent":
    case "deluge":
    case "transmission":
      return integrationCreatorByKind(kind, integration) as DownloadClientIntegration;
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
  }
}
