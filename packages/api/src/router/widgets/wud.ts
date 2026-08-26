import { wudStatsRequestHandler } from "@homarr/request-handler/wud";
import { mockWidgetData } from "@homarr/integrations";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const wudRouter = createTRPCRouter({
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Returns monitored-container counts and available updates from a What's Up Docker integration, or mock statistics from a mock integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "wud", "mock"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") {
        return { stats: mockWidgetData.wud, updatedAt: new Date(mockWidgetData.timestamp) };
      }
      const handler = wudStatsRequestHandler.handler({ ...ctx.integration, kind: "wud" }, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        stats: data,
        updatedAt: timestamp,
      };
    }),
});
