import { createTRPCRouter, publicProcedure } from "../../trpc";
import {createManyIntegrationOfOneItemMiddleware, createOneIntegrationMiddleware} from "../../middlewares/integration";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import {JellyseerrIntegration, MediaRequest, MediaRequestStats, OverseerrIntegration} from "@homarr/integrations";

export const mediaRequestsRouter = createTRPCRouter({
  getLatestRequests: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("query", "overseerr", "jellyseerr"))
    .query(async ({ input }) => {
      return await Promise.all(input.integrationIds.map(async (integrationId) => {
        const channel = createItemAndIntegrationChannel<MediaRequest[]>("mediaRequests-requestList", integrationId);
        return await channel.getAsync();
      }));
    }),
  getStats: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("query", "overseerr", "jellyseerr"))
    .query(async ({ input }) => {
      return await Promise.all(input.integrationIds.map(async (integrationId) => {
        const channel = createItemAndIntegrationChannel<MediaRequestStats[]>("mediaRequests-requestStats", integrationId);
        return await channel.getAsync();
      }));
    }),
  answerRequest: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "overseerr", "jellyseerr"))
    .mutation(async ({ ctx }) => {
      let integration: OverseerrIntegration;

      switch (ctx.integration.kind) {
        case "overseerr":
          integration = new OverseerrIntegration();
          break;
        case "jellyseerr":
          integration = new JellyseerrIntegration();
          break;
      }

      await integration.approveRequestAsync();
      await integration.declineRequestAsync();
    })
});
