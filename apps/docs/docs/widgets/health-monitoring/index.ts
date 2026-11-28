import { WidgetDefinition } from "@site/src/types";
import { IconHeartRateMonitor } from "@tabler/icons-react";

export const healthMonitoringWidget: WidgetDefinition = {
  icon: IconHeartRateMonitor,
  name: "System Health Monitoring",
  description: "Displays information showing the health and status of your system(s).",
  path: "../../widgets/health-monitoring",
  configuration: {
    items: [
      {
        name: "CPU Temp in Fahrenheit",
        description: "Display the CPU temperature in Fahrenheit or Celsius",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show CPU Info",
        description: "Displays CPU info in the system tab",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Memory Info",
        description: "Displays memory info in the system tab",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Uptime",
        description: "Show reported uptime for a system or cluster",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Filesystem Info",
        description: "Displays filesystem info in the system tab",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Visible storage volumes",
        description:
          "Choose volumes from Synology and OpenMediaVault. An empty selection includes all detected volumes. Other integrations always include all their volumes.",
        values: "List of storage volumes",
        defaultValue: "Empty list",
      },
      {
        name: "Default tab",
        description: "Initial tab when the widget has both system and cluster integrations.",
        values: {
          type: "select",
          options: ["System", "Cluster"],
        },
        defaultValue: "System",
      },
      {
        name: "Visible cluster sections",
        description: "Select which sections should be visible in the cluster tab",
        values: "List of Nodes, VMs, LXCs, Storage",
        defaultValue: "Nodes, VMs, LXCs, Storage",
      },
      {
        name: "Section indicator requirement",
        description:
          "'All' requires that all items be online for the indicator to be green. 'Any' requires at least one item to be online.",
        values: {
          type: "select",
          options: ["All", "Any"],
        },
        defaultValue: "All",
      },
    ],
  },
};
