import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import {
  createManyIntegrationOfOneItemMiddleware,
  createOneIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const mediaRequestsRouter = createTRPCRouter({
  getLatestRequests: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("query", "overseerr", "jellyseerr"))
    .query(async ({ input }) => {
      return await Promise.all(
        input.integrationIds.map(async (integrationId) => {
          const channel = createItemAndIntegrationChannel<MediaRequestList>("mediaRequests-requestList", integrationId);
          return await channel.getAsync();
        }),
      );
    }),
  getStats: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("query", "overseerr", "jellyseerr"))
    .query(async ({ input }) => {
      return await Promise.all(
        input.integrationIds.map(async (integrationId) => {
          const channel = createItemAndIntegrationChannel<MediaRequestStats>(
            "mediaRequests-requestStats",
            integrationId,
          );
          return await channel.getAsync();
        }),
      );
    }),
  answerRequest: protectedProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", "overseerr", "jellyseerr"))
    .input(z.object({ requestId: z.number(), answer: z.enum(["approve", "decline"]) }))
    .mutation(async ({ ctx, input }) => {
      const integration = integrationCreatorByKind(ctx.integration.kind, ctx.integration);

      if (input.answer === "approve") {
        await integration.approveRequestAsync(input.requestId);
        return;
      }
      await integration.declineRequestAsync(input.requestId);
    }),
});
