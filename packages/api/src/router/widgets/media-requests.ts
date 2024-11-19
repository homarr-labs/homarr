import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator, MediaRequestStatus } from "@homarr/integrations";
import { mediaRequestListRequestHandler } from "@homarr/request-handler/media-request-list";
import { mediaRequestStatsRequestHandler } from "@homarr/request-handler/media-request-stats";
import { z } from "@homarr/validation";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const mediaRequestsRouter = createTRPCRouter({
  getLatestRequests: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = mediaRequestListRequestHandler.handler(integration, {});
          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            data: await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false }),
          };
        }),
      );
      return results
        .flatMap(({ data, integration }) => data.map((request) => ({ ...request, integrationId: integration.id })))
        .sort(({ status: statusA }, { status: statusB }) => {
          if (statusA === MediaRequestStatus.PendingApproval) {
            return -1;
          }
          if (statusB === MediaRequestStatus.PendingApproval) {
            return 1;
          }
          return 0;
        });
    }),
  getStats: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = mediaRequestStatsRequestHandler.handler(integration, {});
          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            data: await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false }),
          };
        }),
      );
      return {
        stats: results.flatMap((result) => result.data.stats),
        users: results
          .map((result) => result.data.users.map((user) => ({ ...user, integration: result.integration })))
          .flat()
          .sort(({ requestCount: countA }, { requestCount: countB }) => countB - countA),
        integrations: results.map((result) => result.integration),
      };
    }),
  answerRequest: protectedProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("mediaRequest")))
    .input(z.object({ requestId: z.number(), answer: z.enum(["approve", "decline"]) }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const integrationInstance = integrationCreator(integration);

      if (input.answer === "approve") {
        await integrationInstance.approveRequestAsync(input.requestId);
        return;
      }
      await integrationInstance.declineRequestAsync(input.requestId);
    }),
});
