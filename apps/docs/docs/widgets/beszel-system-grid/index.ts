import { WidgetDefinition } from "@site/src/types";
import { IconLayoutGrid } from "@tabler/icons-react";

export const beszelSystemGridWidget: WidgetDefinition = {
  icon: IconLayoutGrid,
  name: "Beszel Systems (Grid)",
  description: "Card grid view of all Beszel-monitored systems with real-time metrics.",
  path: "../../widgets/beszel-system-grid",
  configuration: {
    items: [
      {
        name: "Status filter",
        description: "Filter systems by their current status",
        values: {
          type: "select",
          options: ["All Systems", "Up", "Down", "Paused"],
        },
        defaultValue: "All Systems",
      },
      {
        name: "Show CPU",
        description: "Displays CPU usage on each system card",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show memory",
        description: "Displays memory usage on each system card",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show disk",
        description: "Displays disk usage on each system card",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show GPU",
        description: "Displays GPU usage on each system card",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show load average",
        description: "Displays system load average",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show network",
        description: "Displays network throughput",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show temperature",
        description: "Displays system temperature",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show battery",
        description: "Displays battery level (if available)",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show services",
        description: "Displays running Docker services count",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show uptime",
        description: "Displays system uptime",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show agent version",
        description: "Displays the Beszel agent version",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
