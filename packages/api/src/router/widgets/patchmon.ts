import { patchmonStatsRequestHandler } from "@homarr/request-handler/patchmon";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const patchmonRouter = createTRPCRouter({
  getStats: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get PatchMon host patch statistics including total hosts, hosts needing updates, security update counts, up-to-date hosts, outdated packages, repositories, and OS distribution. REQUIRED: integrationId (single PatchMon integration ID from integration_all). Requires authenticated session (API key or browser login) and integration query access.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "patchmon"))
    .query(async ({ ctx }) => {
      const innerHandler = patchmonStatsRequestHandler.handler(ctx.integration, {});
      const { data } = await innerHandler.getDataAsync();
      return data;
    }),
});
