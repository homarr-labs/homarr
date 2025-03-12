import { IconBuildingBank } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("stockPrice", {
  icon: IconBuildingBank,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      stock: factory.text({
        defaultValue: "AAPL",
      }),
      timeRange: factory.select({
        defaultValue: "1mo",
        options: [
          { value: "1d", label: "1 day" },
          { value: "5d", label: "5 days" },
          { value: "1mo", label: "1 month" },
          { value: "6mo", label: "6 months" },
          { value: "ytd", label: "Year to date" },
          { value: "1y", label: "1 year" },
          { value: "5y", label: "5 years" },
          { value: "10y", label: "10 years" },
          { value: "max", label: "Max" },
        ],
      }),
      timeInterval: factory.select({
        defaultValue: "1d",
        options: [
          { value: "1m", label: "1 minute" },
          { value: "2m", label: "2 minutes" },
          { value: "5m", label: "5 minutes" },
          { value: "15m", label: "15 minutes" },
          { value: "30m", label: "30 minutes" },
          { value: "60m", label: "1 hour" },
          { value: "1d", label: "1 day" },
          { value: "5d", label: "5 days" },
          { value: "1wk", label: "1 week" },
          { value: "1mo", label: "1 month" },
        ],
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
