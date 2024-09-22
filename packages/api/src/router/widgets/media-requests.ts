import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { integrationCreator } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import {
  createManyIntegrationOfOneItemMiddleware,
  createOneIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const mediaRequestsRouter = createTRPCRouter({
  getLatestRequests: publicProcedure
    .unstable_concat(
      createManyIntegrationOfOneItemMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")),
    )
    .query(async ({ input }) => {
      return await Promise.all(
        input.integrationIds.map(async (integrationId) => {
          const channel = createItemAndIntegrationChannel<MediaRequestList>("mediaRequests-requestList", integrationId);
          return await channel.getAsync();
        }),
      );
    }),
  getStats: publicProcedure
    .unstable_concat(
      createManyIntegrationOfOneItemMiddleware("query", ...getIntegrationKindsByCategory("mediaRequest")),
    )
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
