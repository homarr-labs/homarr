import { WidgetDefinition } from "@site/src/types";
import { IconBug } from "@tabler/icons-react";

export const wazuhVulnerabilitiesWidget: WidgetDefinition = {
  icon: IconBug,
  name: "Wazuh Vulnerabilities",
  description: "Vulnerability counts, top CVEs and the most vulnerable agents.",
  path: "../../widgets/wazuh-vulnerabilities",
  configuration: {
    items: [
      {
        name: "Rank CVEs by",
        description: "Order the CVE list by CVSS score or by the number of affected agents.",
        values: { type: "select", options: ["Highest score", "Most affected agents"] },
        defaultValue: "Highest score",
      },
      {
        name: "CVE severity",
        description: "Only list CVEs at or above this severity.",
        values: { type: "select", options: ["All severities", "Medium and above", "High and above", "Critical only"] },
        defaultValue: "All severities",
      },
      {
        name: "Number of CVEs",
        description: "How many CVEs to list (1-50).",
        values: "Number (1-50)",
        defaultValue: "8",
      },
      {
        name: "Number of agents",
        description: "How many agents to list (1-50).",
        values: "Number (1-50)",
        defaultValue: "5",
      },
      {
        name: "Show most vulnerable agents",
        description: "Show the agents with the most critical and high findings.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
