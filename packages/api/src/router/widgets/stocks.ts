import { z } from "zod/v4";

import { stockPriceTimeFrames } from "@homarr/definitions/stocks";
import { fetchStockPriceHandler } from "@homarr/request-handler/stock-price";

import { createApiRouter, publicProcedure } from "../../procedure";

const stockPriceInputSchema = z.object({
  stock: z.string().nonempty(),
  timeRange: z.enum(stockPriceTimeFrames.range),
  timeInterval: z.enum(stockPriceTimeFrames.interval),
});

export const stockPriceRouter = createApiRouter({
  getPriceHistory: publicProcedure.input(stockPriceInputSchema).query(async ({ input }) => {
    const innerHandler = fetchStockPriceHandler.handler({
      stock: input.stock,
      timeRange: input.timeRange,
      timeInterval: input.timeInterval,
    });
    return await innerHandler.getDataAsync();
  }),
});
