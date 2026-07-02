import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync, downloadClientItemSchema } from "@homarr/integrations";
import { downloadClientRequestHandler } from "@homarr/request-handler/downloads";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const createDownloadClientIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("downloadClient"));

export const downloadsRouter = createTRPCRouter({
  getJobsAndStatuses: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get active download jobs and queue status from connected download clients (qBittorrent, SABnzbd, Transmission, Deluge, NZBGet). REQUIRED: integrationIds (array of download client integration IDs from integration_all). OPTIONAL: limitPerIntegration (number, default 50)",
      },
    })
    .concat(createDownloadClientIntegrationMiddleware("query"))
    .input(z.object({ limitPerIntegration: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = downloadClientRequestHandler.handler(integration, { limit: input.limitPerIntegration });
        const { data, timestamp } = await innerHandler.getDataAsync();
        return {
          integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
          data,
        };
      });
    }),
  pause: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Pause all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
      },
    })
    .concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.pauseQueueAsync();
        }),
      );
    }),
  pauseItem: protectedProcedure
    .concat(createDownloadClientIntegrationMiddleware("interact"))
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
    .meta({
      mcp: {
        enabled: true,
        description:
          "Resume all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
      },
    })
    .concat(createDownloadClientIntegrationMiddleware("interact"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.resumeQueueAsync();
        }),
      );
    }),
  resumeItem: protectedProcedure
    .concat(createDownloadClientIntegrationMiddleware("interact"))
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
    .concat(createDownloadClientIntegrationMiddleware("interact"))
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
