import { paperlessNgxStatsRequestHandler } from "@homarr/request-handler/paperless-ngx";
import { mockWidgetData } from "@homarr/integrations";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const paperlessNgxRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "paperlessNgx", "mock"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.paperlessNgx;
      const innerHandler = paperlessNgxStatsRequestHandler.handler({ ...ctx.integration, kind: "paperlessNgx" }, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
