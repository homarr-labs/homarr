import dayjs from "dayjs";

import { fetchWithTimeout } from "@homarr/common";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const fetchStockPriceHandler = createCachedWidgetRequestHandler({
  queryKey: "fetchStockPriceResult",
  widgetKind: "stockPrice",
  async requestAsync(input: { stock: string; timeRange: string; timeInterval: string }) {
    const response = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${input.stock}?range=${input.timeRange}&interval=${input.timeInterval}`,
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.description);
    }

    return data.chart.result[0];
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});
