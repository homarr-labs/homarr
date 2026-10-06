import { WidgetDefinition } from "@site/src/types";
import { IconDevicesPc } from "@tabler/icons-react";

export const wazuhAgentsWidget: WidgetDefinition = {
  icon: IconDevicesPc,
  name: "Wazuh Agents",
  description: "Sortable list of Wazuh agents with status, OS, version and last keepalive.",
  path: "../../widgets/wazuh-agents",
  configuration: {
    items: [
      {
        name: "Show agents",
        description: "Initial status filter. The count tiles on the widget can also be clicked to filter.",
        values: {
          type: "select",
          options: ["All agents", "Active", "Disconnected", "Not active (disconnected, never connected, pending)"],
        },
        defaultValue: "All agents",
      },
      {
        name: "Sort by",
        description: "Initial sort column. Click a column header to change it.",
        values: {
          type: "select",
          options: ["Status", "Name", "IP address", "Operating system", "Wazuh version", "Last keepalive"],
        },
        defaultValue: "Status",
      },
      {
        name: "Show Wazuh version column",
        description: "Show the agent version. Agents older than the newest version are highlighted.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show groups column",
        description: "Show the agent groups.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
