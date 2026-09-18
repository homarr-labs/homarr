import { IconChartBar } from "@tabler/icons-react";
import type { WidgetDefinition } from "@site/src/types";

export const statsWidget: WidgetDefinition = {
  icon: IconChartBar,
  name: "Statistics",
  description: "Combine selected statistics from multiple integrations in cards or compact rows.",
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
        description: "Show one metric per row instead of responsive cards.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show source icon / name",
        description: "Identify the integration supplying each metric.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show last successful update",
        description: "Show the timestamp retained with each source snapshot.",
        values: { type: "boolean" },
        defaultValue: "yes",
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
