import { archiveTeamWarriorRequestHandler } from "@homarr/request-handler/archive-team-warrior";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const archiveTeamWarriorRouter = createTRPCRouter({
  getStatus: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "archiveTeamWarrior"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") {
        return { status: mockWidgetData.archiveTeamWarrior, updatedAt: new Date(mockWidgetData.timestamp) };
      }

      const handler = archiveTeamWarriorRequestHandler.handler({ ...ctx.integration, kind: "archiveTeamWarrior" }, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        status: data,
        updatedAt: timestamp,
      };
    }),
});
