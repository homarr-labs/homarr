import { WidgetDefinition } from "@site/src/types";
import { IconLockExclamation } from "@tabler/icons-react";

export const wazuhAuthFailuresWidget: WidgetDefinition = {
  icon: IconLockExclamation,
  name: "Wazuh Authentication Failures",
  description: "Failed logins and brute-force alerts per agent with sparklines.",
  path: "../../widgets/wazuh-auth-failures",
  configuration: {
    items: [
      {
        name: "Time window (hours)",
        description: "Number of hours to look back (1-168).",
        values: "Number (1-168)",
        defaultValue: "24",
      },
      {
        name: "Number of agents",
        description: "How many agents to list, ordered by failed logins (1-25).",
        values: "Number (1-25)",
        defaultValue: "6",
      },
      {
        name: "Show top source IPs",
        description: "Show the source IPs with the most failures under each agent.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
