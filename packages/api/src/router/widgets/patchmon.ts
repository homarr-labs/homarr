import { patchmonStatsRequestHandler } from "@homarr/request-handler/patchmon";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const patchmonRouter = createTRPCRouter({
  getStats: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get PatchMon host patch statistics including total hosts, hosts needing updates, security update counts, up-to-date hosts, outdated packages, repositories, and OS distribution. REQUIRED: integrationId (single PatchMon integration ID from integration_all)",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "patchmon"))
    .query(async ({ ctx }) => {
      const innerHandler = patchmonStatsRequestHandler.handler(ctx.integration, {});
      const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data.data;
    }),
});
