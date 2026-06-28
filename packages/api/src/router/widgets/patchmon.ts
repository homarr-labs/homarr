import { patchmonStatsRequestHandler } from "@homarr/request-handler/patchmon";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const patchmonRouter = createTRPCRouter({
  getStats: publicProcedure.concat(createOneIntegrationMiddleware("query", "patchmon")).query(async ({ ctx }) => {
    const innerHandler = patchmonStatsRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),
});
