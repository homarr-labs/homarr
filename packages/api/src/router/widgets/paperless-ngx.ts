import { paperlessNgxStatsRequestHandler } from "@homarr/request-handler/paperless-ngx";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const paperlessNgxRouter = createTRPCRouter({
  getStats: publicProcedure.concat(createOneIntegrationMiddleware("query", "paperlessNgx")).query(async ({ ctx }) => {
    const innerHandler = paperlessNgxStatsRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),
});
