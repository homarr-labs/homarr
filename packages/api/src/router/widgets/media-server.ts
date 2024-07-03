import { observable } from "@trpc/server/observable";

import type { StreamSession } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const mediaServerRouter = createTRPCRouter({
  getCurrentStreams: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("jellyfin", "plex"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const channel = createItemAndIntegrationChannel<StreamSession[]>("mediaServer", integration.id);
          const data = await channel.getAsync();
          return {
            integrationId: integration.id,
            sessions: data?.data ?? [],
          };
        }),
      );
    }),
  subscribeToCurrentStreams: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("jellyfin", "plex"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; data: StreamSession[] }>((emit) => {
        for (const integration of ctx.integrations) {
          const channel = createItemAndIntegrationChannel<StreamSession[]>("mediaServer", integration.id);
          void channel.subscribeAsync((sessions) => {
            emit.next({
              integrationId: integration.id,
              data: sessions,
            });
          });
        }
      });
    }),
});
