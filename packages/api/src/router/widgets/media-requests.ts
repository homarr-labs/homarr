import { createTRPCRouter, publicProcedure } from "../../trpc";
import { createManyIntegrationOfOneItemMiddleware } from "../../middlewares/integration";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import type {MediaRequest, MediaRequestStats} from "@homarr/integrations";

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
    })
});
