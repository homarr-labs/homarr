import { observable } from "@trpc/server/observable";
import { z } from "zod";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { createIntegrationAsync, downloadClientItemSchema } from "@homarr/integrations";
import { downloadClientRequestHandler } from "@homarr/request-handler/downloads";

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
        ctx.integrations.map(async (integration) => {
          const innerHandler = downloadClientRequestHandler.handler(integration, {});

          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            data,
          };
        }),
      );
    }),
  subscribeToJobsAndStatuses: publicProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("query"))
    .subscription(({ ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"downloadClient"> }>;
        data: DownloadClientJobsAndStatus;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = downloadClientRequestHandler.handler(integrationWithSecrets, {});
          const unsubscribe = innerHandler.subscribe((data) => {
            emit.next({
              integration,
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
          const integrationInstance = await createIntegrationAsync(integration);
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
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.pauseItemAsync(input.item);
        }),
      );
    }),
  resume: protectedProcedure
    .unstable_concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
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
          const integrationInstance = await createIntegrationAsync(integration);
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
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.deleteItemAsync(input.item, input.fromDisk);
        }),
      );
    }),
});
