import { IconChartLine } from "@tabler/icons-react";
import type { WidgetDefinition } from "@site/src/types";

export const metricGraphWidget: WidgetDefinition = {
  icon: IconChartLine,
  name: "Metric graph",
  description: "Graph up to four values from your integrations, such as sensors or statistics, over time.",
  path: "../../widgets/metric-graph",
  configuration: {
    items: [
      {
        name: "Values",
        description: "Up to four sensors or numeric statistics from the selected integrations.",
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Layout",
        description: "Show one card per value, or all values in one shared graph.",
        values: { type: "select", options: ["One card per value", "One shared graph"] },
        defaultValue: "One card per value",
      },
      {
        name: "Time range",
        description: "How much history each graph shows.",
        values: { type: "select", options: ["15 minutes", "1 hour", "6 hours", "24 hours"] },
        defaultValue: "1 hour",
      },
    ],
  },
};
