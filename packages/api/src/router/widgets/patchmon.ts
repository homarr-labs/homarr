import { patchmonStatsRequestHandler } from "@homarr/request-handler/patchmon";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, protectedProcedure } from "../../procedure";

export const patchmonRouter = createApiRouter({
  getStats: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get PatchMon host patch statistics including total hosts, hosts needing updates, security update counts, up-to-date hosts, outdated packages, repositories, and OS distribution. REQUIRED: integrationId (single PatchMon integration ID from integration_all). Requires authenticated session (API key or browser login) and integration query access.",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "patchmon"))
    .query(async ({ context }) => {
      if (context.integration.kind === "mock") return mockWidgetData.patchmon;
      const innerHandler = patchmonStatsRequestHandler.handler({ ...context.integration, kind: "patchmon" }, {});
      const { data } = await innerHandler.getDataAsync();
      return data;
    }),
});
