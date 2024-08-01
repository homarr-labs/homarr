import { TRPCError } from "@trpc/server";

import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { JellyseerrIntegration, OverseerrIntegration } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import {
  createManyIntegrationOfOneItemMiddleware,
  createOneIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

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
  answerRequest: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "overseerr", "jellyseerr"))
    .input(z.object({ requestId: z.number(), answer: z.enum(["approve", "decline"]) }))
    .mutation(async ({ ctx, input }) => {
      let integration: OverseerrIntegration;

      switch (ctx.integration.kind) {
        case "overseerr":
          integration = new OverseerrIntegration(ctx.integration);
          break;
        case "jellyseerr":
          integration = new JellyseerrIntegration(ctx.integration);
          break;
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
          });
      }

      if (input.answer === "approve") {
        await integration.approveRequestAsync(input.requestId);
        return;
      }
      await integration.declineRequestAsync(input.requestId);
    }),
});
