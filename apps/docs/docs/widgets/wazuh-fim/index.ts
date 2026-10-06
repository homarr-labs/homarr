import { WidgetDefinition } from "@site/src/types";
import { IconFileAlert } from "@tabler/icons-react";

export const wazuhFimWidget: WidgetDefinition = {
  icon: IconFileAlert,
  name: "Wazuh File Integrity",
  description: "Recent file integrity monitoring (syscheck) events.",
  path: "../../widgets/wazuh-fim",
  configuration: {
    items: [
      {
        name: "Time range",
        description: "Period to show events for.",
        values: { type: "select", options: ["Last hour", "Last 24 hours", "Last 7 days", "Last 30 days"] },
        defaultValue: "Last 24 hours",
      },
      {
        name: "Events",
        description: "Only list one kind of event. The counts always include all events.",
        values: { type: "select", options: ["All events", "Added", "Modified", "Deleted"] },
        defaultValue: "All events",
      },
      {
        name: "Number of events",
        description: "How many events to list (1-100).",
        values: "Number (1-100)",
        defaultValue: "20",
      },
      {
        name: "Include Windows registry events",
        description: "Include registry key and value changes reported by Windows agents.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
