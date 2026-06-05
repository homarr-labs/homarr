import { observable } from "@trpc/server/observable";

import type { ArchiveTeamWarriorStatus } from "@homarr/integrations";
import { archiveTeamWarriorRequestHandler } from "@homarr/request-handler/archive-team-warrior";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const archiveTeamWarriorRouter = createTRPCRouter({
  getStatus: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "archiveTeamWarrior"))
    .query(async ({ ctx }) => {
      const handler = archiveTeamWarriorRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

      return {
        status: data,
        updatedAt: timestamp,
      };
    }),

  subscribeStatus: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "archiveTeamWarrior"))
    .subscription(({ ctx }) => {
      return observable<{ status: ArchiveTeamWarriorStatus; updatedAt: Date }>((emit) => {
        const handler = archiveTeamWarriorRequestHandler.handler(ctx.integration, {});
        const unsubscribe = handler.subscribe((status) => {
          emit.next({
            status,
            updatedAt: new Date(),
          });
        });

        return () => {
          unsubscribe();
        };
      });
    }),
});
