import { WidgetDefinition } from "@site/src/types";
import { IconShieldBolt } from "@tabler/icons-react";

export const wazuhAlertsWidget: WidgetDefinition = {
  icon: IconShieldBolt,
  name: "Wazuh Alerts Feed",
  description: "Recent Wazuh alerts with level, MITRE ATT&CK techniques, agent and source IP.",
  path: "../../widgets/wazuh-alerts",
  configuration: {
    items: [
      {
        name: "Minimum rule level",
        description: "Wazuh levels: 0-6 low, 7-11 medium, 12-14 high, 15+ critical.",
        values: "Number (0-16)",
        defaultValue: "7",
      },
      {
        name: "Time window (hours)",
        description: "Number of hours to look back (1-720).",
        values: "Number (1-720)",
        defaultValue: "24",
      },
      {
        name: "Number of alerts",
        description: "How many alerts to list (1-100).",
        values: "Number (1-100)",
        defaultValue: "25",
      },
      {
        name: "Show MITRE ATT&CK techniques",
        description: "Show the technique chips of each alert.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show agent",
        description: "Show the agent that raised the alert.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show source IP",
        description: "Show the source IP of the alert. Public addresses are highlighted.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show rule ID",
        description: "Show the Wazuh rule ID.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
