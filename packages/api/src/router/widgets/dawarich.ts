import { z } from "zod/v4";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dawarichRouter = createTRPCRouter({
  getStatistics: publicProcedure.concat(createOneIntegrationMiddleware("query", "dawarich")).query(async ({ ctx }) => {
    const { dawarichStatisticsRequestHandler } = await import("@homarr/request-handler/dawarich");
    const innerHandler = dawarichStatisticsRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),

  getPlaces: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "dawarich"))
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { dawarichPlacesRequestHandler } = await import("@homarr/request-handler/dawarich");
      const innerHandler = dawarichPlacesRequestHandler.handler(ctx.integration, {});
      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data.slice(0, input.limit);
    }),
});
