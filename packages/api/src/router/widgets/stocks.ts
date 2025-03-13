import { z } from "zod";

import { fetchStockPriceHandler } from "@homarr/request-handler/stock-price";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const stockPriceInputSchema = z.object({
  stock: z.string().nonempty(),
  timeRange: z.enum(["1d", "5d", "1mo", "6mo", "ytd", "1y", "5y", "10y", "max"]),
  timeInterval: z.enum(["1m", "5m", "15m", "30m", "1h", "6h", "1d", "5d", "1wk", "1mo"]),
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
