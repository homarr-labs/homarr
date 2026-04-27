import { optionsBuilder } from "../options";

export const stockPriceTimeFrames = {
  range: ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "10y", "max"] as const,
  interval: ["5m", "15m", "30m", "1h", "1d", "5d", "1wk", "1mo"] as const,
};

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      stock: factory.text({ defaultValue: "AAPL" }),
      timeRange: factory.select({
        defaultValue: "1mo" as const,
        options: stockPriceTimeFrames.range.map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.stockPrice.option.timeRange.option.${value}.label`),
        })),
      }),
      timeInterval: factory.select({
        defaultValue: "1d" as const,
        options: stockPriceTimeFrames.interval.map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.stockPrice.option.timeInterval.option.${value}.label`),
        })),
      }),
    }));
  },
};
