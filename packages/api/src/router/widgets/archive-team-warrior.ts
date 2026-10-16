import { archiveTeamWarriorRequestHandler } from "@homarr/request-handler/archive-team-warrior";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const archiveTeamWarriorRouter = createApiRouter({
  getStatus: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "archiveTeamWarrior"))
    .query(async ({ context }) => {
      if (context.integration.kind === "mock") {
        return { status: mockWidgetData.archiveTeamWarrior, updatedAt: new Date(mockWidgetData.timestamp) };
      }

      const handler = archiveTeamWarriorRequestHandler.handler(
        { ...context.integration, kind: "archiveTeamWarrior" },
        {},
      );
      const { data, timestamp } = await handler.getDataAsync();

      return {
        status: data,
        updatedAt: timestamp,
      };
    }),
});
