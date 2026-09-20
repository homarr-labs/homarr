import { IconChartBar } from "@tabler/icons-react";
import type { WidgetDefinition } from "@site/src/types";

export const statsWidget: WidgetDefinition = {
  icon: IconChartBar,
  name: "Statistics",
  description: "Combine selected statistics from multiple integrations in cards, compact rows, or grouped tables.",
  path: "../../widgets/stats",
  configuration: {
    items: [
      {
        name: "Metrics",
        description:
          "Ordered fields from selected integration instances, with custom labels, visibility, and compact formatting.",
        values: "Up to 100 entries",
        defaultValue: "None",
      },
      {
        name: "Compact rows",
        description: "Display compact metric rows in responsive columns.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show source icon",
        description: "Identify the integration supplying each metric.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Table view",
        description: "Group metrics under collapsible integration headers in responsive columns.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Spacing",
        description: "Space between metric cards or rows.",
        values: { type: "select", options: ["Extra small", "Small", "Medium"] },
        defaultValue: "Extra small",
      },
    ],
  },
};
