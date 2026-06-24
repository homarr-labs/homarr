import { archiveTeamWarriorRequestHandler } from "@homarr/request-handler/archive-team-warrior";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const archiveTeamWarriorRouter = createTRPCRouter({
  getStatus: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "archiveTeamWarrior"))
    .query(async ({ ctx }) => {
      const handler = archiveTeamWarriorRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        status: data,
        updatedAt: timestamp,
      };
    }),
});
