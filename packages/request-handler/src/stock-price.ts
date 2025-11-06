import dayjs from "dayjs";
import { z } from "zod/v4";

import { fetchWithTimeout } from "@homarr/common";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const fetchStockPriceHandler = createCachedWidgetRequestHandler({
  queryKey: "fetchStockPriceResult",
  widgetKind: "stockPrice",
  async requestAsync(input: { stock: string; timeRange: string; timeInterval: string }) {
    const response = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${input.stock}?range=${input.timeRange}&interval=${input.timeInterval}`,
    );
    const data = dataSchema.parse(await response.json());

    if ("error" in data) {
      throw new Error(data.error.description);
    }
    if (data.chart.result.length !== 1) {
      throw new Error("Received multiple results");
    }
    if (!data.chart.result[0]) {
      throw new Error("Received invalid data");
    }
    
    const result = data.chart.result[0];
    // Filter out null values from price arrays (Yahoo Finance returns null for missing data points)
    if (result.indicators.quote[0]) {
      result.indicators.quote[0].close = result.indicators.quote[0].close.filter(
        (value): value is number => value !== null && value !== undefined,
      );
    }

    return result;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

const dataSchema = z
  .object({
    error: z.object({
      description: z.string(),
    }),
  })
  .or(
    z.object({
      chart: z.object({
        result: z.array(
          z.object({
            indicators: z.object({
              quote: z.array(
                z.object({
                  close: z.array(z.number()),
                }),
              ),
            }),
            meta: z.object({
              symbol: z.string(),
              shortName: z.string(),
            }),
          }),
        ),
      }),
    }),
  );
