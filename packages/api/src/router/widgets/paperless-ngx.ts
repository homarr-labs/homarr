import { paperlessNgxStatsRequestHandler } from "@homarr/request-handler/paperless-ngx";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const paperlessNgxRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "paperlessNgx"))
    .query(async ({ ctx }) => {
      const innerHandler = paperlessNgxStatsRequestHandler.handler(ctx.integration, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
