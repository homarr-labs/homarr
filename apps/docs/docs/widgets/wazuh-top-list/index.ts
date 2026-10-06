import { WidgetDefinition } from "@site/src/types";
import { IconListNumbers } from "@tabler/icons-react";

export const wazuhTopListWidget: WidgetDefinition = {
  icon: IconListNumbers,
  name: "Wazuh Top List",
  description: "Top rules, agents, source IPs or MITRE ATT&CK tactics and techniques by alert count.",
  path: "../../widgets/wazuh-top-list",
  configuration: {
    items: [
      {
        name: "Rank",
        description: "What to rank by alert count.",
        values: {
          type: "select",
          options: [
            "Top rules",
            "Top agents by alerts",
            "Top source IPs",
            "Top MITRE ATT&CK tactics",
            "Top MITRE ATT&CK techniques",
          ],
        },
        defaultValue: "Top rules",
      },
      {
        name: "Time range",
        description: "Period to rank alerts for.",
        values: { type: "select", options: ["Last hour", "Last 24 hours", "Last 7 days", "Last 30 days"] },
        defaultValue: "Last 24 hours",
      },
      {
        name: "Number of entries",
        description: "How many entries to list (1-50).",
        values: "Number (1-50)",
        defaultValue: "8",
      },
      {
        name: "Minimum rule level",
        description: "Ignore alerts below this Wazuh rule level (0-16).",
        values: "Number (0-16)",
        defaultValue: "0",
      },
      {
        name: "Show bars",
        description: "Show an inline bar relative to the top entry.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
