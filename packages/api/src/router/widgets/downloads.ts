import { z } from "zod/v4";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { downloadClientItemSchema } from "@homarr/integrations/downloads";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import { downloadClientRequestHandler } from "@homarr/request-handler/downloads";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

interface DownloadClientQueryResultBase {
  integrationId: string;
  integrationName: string;
}

type DownloadClientQueryResult = DownloadClientQueryResultBase &
  (
    | {
        integration: {
          id: string;
          name: string;
          kind: IntegrationKindByCategory<"downloadClient">;
          updatedAt: Date;
        };
        data: DownloadClientJobsAndStatus;
        error?: never;
      }
    | {
        integration: {
          id: string;
          name: string;
          kind: IntegrationKindByCategory<"downloadClient">;
        };
        data: null;
        error: string;
      }
  );

export const downloadsRouter = createTRPCRouter({
  getJobsAndStatuses: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get active download jobs and queue status from connected download clients (qBittorrent, SABnzbd, Transmission, Deluge, NZBGet). REQUIRED: integrationIds (array of download client integration IDs from integration_all). OPTIONAL: limitPerIntegration (number, default 50)",
      },
    })
    .concat(createManyWidgetIntegrationMiddleware("query", "downloads"))
    .input(z.object({ limitPerIntegration: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries<(typeof ctx.integrations)[number], DownloadClientQueryResult>(
        ctx.integrations,
        async (integration) => {
          const innerHandler = downloadClientRequestHandler.handler(integration, { limit: input.limitPerIntegration });
          const { data, timestamp } = await innerHandler.getDataAsync();
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
            data,
          };
        },
        {
          fallback: (integration) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            data: null,
            error: PUBLIC_INTEGRATION_ERROR,
          }),
          throwOnAllFailures: true,
        },
      );
    }),
  pause: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Pause all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
      },
    })
    .concat(createManyWidgetIntegrationMiddleware("interact", "downloads"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.pauseQueueAsync();
        }),
      );
      downloadClientRequestHandler.invalidateCache();
    }),
  pauseItem: protectedProcedure
    .concat(createManyWidgetIntegrationMiddleware("interact", "downloads"))
    .input(z.object({ item: downloadClientItemSchema }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.pauseItemAsync(input.item);
        }),
      );
      downloadClientRequestHandler.invalidateCache();
    }),
  resume: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Resume all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
      },
    })
    .concat(createManyWidgetIntegrationMiddleware("interact", "downloads"))
    .mutation(async ({ ctx }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.resumeQueueAsync();
        }),
      );
      downloadClientRequestHandler.invalidateCache();
    }),
  resumeItem: protectedProcedure
    .concat(createManyWidgetIntegrationMiddleware("interact", "downloads"))
    .input(z.object({ item: downloadClientItemSchema }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.resumeItemAsync(input.item);
        }),
      );
      downloadClientRequestHandler.invalidateCache();
    }),
  deleteItem: protectedProcedure
    .concat(createManyWidgetIntegrationMiddleware("interact", "downloads"))
    .input(z.object({ item: downloadClientItemSchema, fromDisk: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        ctx.integrations.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync(integration);
          await integrationInstance.deleteItemAsync(input.item, input.fromDisk);
        }),
      );
      downloadClientRequestHandler.invalidateCache();
    }),
});
