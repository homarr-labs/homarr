import { WidgetDefinition } from "@site/src/types";
import { IconTable } from "@tabler/icons-react";

export const komodoServerOverviewWidget: WidgetDefinition = {
  icon: IconTable,
  name: "Komodo Servers",
  description: "Displays live resource usage and version information for servers managed by Komodo.",
  path: "../../widgets/komodo-server-overview",
  configuration: {
    items: [
      {
        name: "Show CPU",
        description: "Display current CPU usage.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show memory",
        description: "Display current memory usage.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show disk",
        description: "Display combined disk usage.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show load average",
        description: "Display the 1, 5, and 15 minute load averages and available core counts.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show network",
        description: "Display current network ingress and egress.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show version",
        description: "Display the Komodo Periphery version reported by each server.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Refresh interval",
        description: "How often to retrieve new data from Komodo, in seconds.",
        values: { type: "string" },
        defaultValue: "30",
      },
    ],
  },
};
