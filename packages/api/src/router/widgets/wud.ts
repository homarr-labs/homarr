import { wudStatsRequestHandler } from "@homarr/request-handler/wud";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const wudRouter = createTRPCRouter({
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Returns monitored-container counts and available updates from a What's Up Docker integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "wud"))
    .query(async ({ ctx }) => {
      const handler = wudStatsRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        stats: data,
        updatedAt: timestamp,
      };
    }),
});
