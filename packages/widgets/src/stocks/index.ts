import { IconBuildingBank } from "@tabler/icons-react";

import { stockPriceTimeFrames } from "@homarr/definitions/stocks";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

const timeRangeOptions = stockPriceTimeFrames.range;
const timeIntervalOptions = stockPriceTimeFrames.interval;

export const { definition, componentLoader } = createWidgetDefinition("stockPrice", {
  supportsAdvancedFocus: true,
  icon: IconBuildingBank,
  queryKey: [["widget", "stockPrice", "getPriceHistory"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      stock: scope.options.stock,
      timeRange: scope.options.timeRange,
      timeInterval: scope.options.timeInterval,
    }),
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      stock: factory.text({
        defaultValue: "AAPL",
      }),
      timeRange: factory.select({
        defaultValue: "1mo",
        options: timeRangeOptions.map((value) => ({
          value,
          label: (t) => t(`widget.stockPrice.option.timeRange.option.${value}.label`),
        })),
      }),
      timeInterval: factory.select({
        defaultValue: "1d",
        options: timeIntervalOptions.map((value) => ({
          value,
          label: (t) => t(`widget.stockPrice.option.timeInterval.option.${value}.label`),
        })),
      }),
      showDetails: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
