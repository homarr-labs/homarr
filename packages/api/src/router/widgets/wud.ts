import { wudStatsRequestHandler } from "@homarr/request-handler/wud";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const wudRouter = createApiRouter({
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Returns monitored-container counts and available updates from a What's Up Docker integration, or mock statistics from a mock integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "wud"))
    .query(async ({ context }) => {
      if (context.integration.kind === "mock") {
        return { stats: mockWidgetData.wud, updatedAt: new Date(mockWidgetData.timestamp) };
      }
      const handler = wudStatsRequestHandler.handler({ ...context.integration, kind: "wud" }, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        stats: data,
        updatedAt: timestamp,
      };
    }),
});
