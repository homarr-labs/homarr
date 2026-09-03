import { llamacppStatsRequestHandler } from "@homarr/request-handler/llamacpp";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const llamacppRouter = createTRPCRouter({
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Returns health, loaded model and Prometheus metrics (generation speed, token counts, request queue) from a llama.cpp (llama-server) integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "llamacpp"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") {
        return { stats: mockWidgetData.llamacpp, updatedAt: new Date(mockWidgetData.timestamp) };
      }
      const handler = llamacppStatsRequestHandler.handler({ ...ctx.integration, kind: "llamacpp" }, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        stats: data,
        updatedAt: timestamp,
      };
    }),
});
