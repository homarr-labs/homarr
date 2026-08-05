import { wudStatsRequestHandler } from "@homarr/request-handler/wud";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const wudRouter = createTRPCRouter({
  getStats: publicProcedure.concat(createOneIntegrationMiddleware("query", "wud")).query(async ({ ctx }) => {
    const handler = wudStatsRequestHandler.handler(ctx.integration, {});
    const { data, timestamp } = await handler.getDataAsync();

    return {
      stats: data,
      updatedAt: timestamp,
    };
  }),
});
