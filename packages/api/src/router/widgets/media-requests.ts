import { z } from "zod/v4";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRequest, MediaRequestStats } from "@homarr/integrations/types";
import { mediaRequestStatusConfiguration } from "@homarr/integrations/types";
import {
  mediaRequestListInputSchema,
  mediaRequestListRequestHandler,
} from "@homarr/request-handler/media-request-list";
import { mediaRequestStatsRequestHandler } from "@homarr/request-handler/media-request-stats";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

interface IntegrationQueryResult<TData> {
  integration: { id: string; name: string; kind: IntegrationKindByCategory<"mediaRequest"> };
  data: TData;
  error?: string;
}

export const mediaRequestsRouter = createTRPCRouter({
  getLatestRequests: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get latest media requests from Overseerr/Jellyseerr with their status (pending, approved, declined, failed, completed). REQUIRED: integrationIds (array of Overseerr/Jellyseerr integration IDs from integration_all). OPTIONAL: statuses (array of statuses to include, must be non-empty) and recentDays (number 0-365; 0 disables the time filter).",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")))
    .input(mediaRequestListInputSchema)
    .query(async ({ ctx, input }) => {
      const results: IntegrationQueryResult<MediaRequest[]>[] = await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const { data } = await mediaRequestListRequestHandler.handler(integration, input).getDataAsync();
          return {
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            data,
            error: undefined as string | undefined,
          };
        },
        {
          fallback: (integration) => ({
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            data: [],
            error: "Integration request failed",
          }),
          throwOnAllFailures: true,
        },
      );
      const requests = results
        .flatMap(({ data, integration }) =>
          data.map((request) => ({
            ...request,
            integrationId: integration.id,
            integration,
          })),
        )
        .toSorted((dataA, dataB) => {
          if (dataA.status === dataB.status) {
            return dataB.createdAt.getTime() - dataA.createdAt.getTime();
          }

          return (
            mediaRequestStatusConfiguration[dataA.status].position -
            mediaRequestStatusConfiguration[dataB.status].position
          );
        });
      return {
        requests,
        failedIntegrations: results.flatMap(({ integration, error }) =>
          error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
        ),
      };
    }),
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get media request statistics including total counts and top requesters. REQUIRED: integrationIds (array of Overseerr/Jellyseerr integration IDs from integration_all)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")))
    .query(async ({ ctx }) => {
      const results: IntegrationQueryResult<{
        stats: MediaRequestStats["stats"] | null;
        users: MediaRequestStats["users"];
      }>[] = await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const { data } = await mediaRequestStatsRequestHandler.handler(integration, {}).getDataAsync();
          return {
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            data: { ...data, stats: data.stats as typeof data.stats | null },
            error: undefined as string | undefined,
          };
        },
        {
          fallback: (integration) => ({
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            data: { stats: null, users: [] },
            error: "Integration request failed",
          }),
          throwOnAllFailures: true,
        },
      );
      return {
        stats: results.flatMap((result) => (result.data.stats ? [result.data.stats] : [])),
        users: results
          .map((result) =>
            result.data.users.map((user) => ({
              ...user,
              integration: result.integration,
            })),
          )
          .flat()
          .toSorted(({ requestCount: countA }, { requestCount: countB }) => countB - countA),
        integrations: results.map((result) => result.integration),
        failedIntegrations: results.flatMap(({ integration, error }) =>
          error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
        ),
      };
    }),
  answerRequest: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Approve or decline a pending media request. REQUIRED: integrationId (single Overseerr/Jellyseerr integration ID), requestId (number from getLatestRequests), answer ('approve' or 'decline')",
      },
    })
    .concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("mediaRequest")))
    .input(
      z.object({
        requestId: z.number(),
        answer: z.enum(["approve", "decline"]),
      }),
    )
    .mutation(async ({ ctx: { integration }, input }) => {
      const integrationInstance = await createIntegrationAsync(integration);

      const answerActions = {
        approve: (id: number) => integrationInstance.approveRequestAsync(id),
        decline: (id: number) => integrationInstance.declineRequestAsync(id),
      } as const;

      await answerActions[input.answer](input.requestId);
      return { success: true };
    }),
});
