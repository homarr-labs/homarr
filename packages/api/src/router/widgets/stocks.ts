import { z } from "zod";

import { fetchStockPriceHandler } from "@homarr/request-handler/stock-price";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const stockPriceInputSchema = z.object({
  stock: z.string().nonempty(),
  timeRange: z.string().nonempty(),
  timeInterval: z.string().nonempty(),
});

export const stockPriceRouter = createTRPCRouter({
  getPrices: publicProcedure.input(stockPriceInputSchema).query(async ({ input }) => {
    const innerHandler = fetchStockPriceHandler.handler({
      stock: input.stock,
      timeRange: input.timeRange,
      timeInterval: input.timeInterval,
    });
    return await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
  }),
});
