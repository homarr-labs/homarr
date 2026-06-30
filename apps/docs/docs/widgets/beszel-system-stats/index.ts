import { WidgetDefinition } from "@site/src/types";
import { IconChartAreaLine } from "@tabler/icons-react";

export const beszelSystemStatsWidget: WidgetDefinition = {
  icon: IconChartAreaLine,
  name: "Beszel System Stats",
  description: "Time-series charts for CPU, memory, disk, network, and Docker container metrics from Beszel.",
  path: "../../widgets/beszel-system-stats",
  configuration: {
    items: [
      {
        name: "System",
        description: "The Beszel system to display stats for. Searchable select populated from the integration.",
        values: { type: "string" },
        defaultValue: "First available system",
      },
      {
        name: "Time period",
        description:
          "The time range for chart data. '1 Minute' enables live streaming via PocketBase SSE (requires Beszel agent >= 0.13.0)",
        values: {
          type: "select",
          options: ["1 Minute", "1 Hour", "12 Hours", "24 Hours", "1 Week", "30 Days"],
        },
        defaultValue: "1 Hour",
      },
      {
        name: "Show CPU",
        description: "Displays the CPU usage chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show memory",
        description: "Displays the memory usage chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show disk",
        description: "Displays the disk usage chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show disk I/O",
        description: "Displays the disk I/O chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show network",
        description: "Displays the network chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Docker CPU",
        description: "Displays Docker container CPU usage chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Docker memory",
        description: "Displays Docker container memory usage chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Docker network",
        description: "Displays Docker container network chart",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
