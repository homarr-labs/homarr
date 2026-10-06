import { WidgetDefinition } from "@site/src/types";
import { IconShieldHalfFilled } from "@tabler/icons-react";

export const wazuhSummaryWidget: WidgetDefinition = {
  icon: IconShieldHalfFilled,
  name: "Wazuh Alert Severity",
  description: "Alert severity breakdown with a trend against the previous period.",
  path: "../../widgets/wazuh-summary",
  configuration: {
    items: [
      {
        name: "Time range",
        description: "Period to count alerts for. The trend compares it with the period right before it.",
        values: { type: "select", options: ["Last hour", "Last 24 hours", "Last 7 days", "Last 30 days"] },
        defaultValue: "Last 24 hours",
      },
      {
        name: "Show trend against the previous period",
        description: "Show the up or down percentage per severity and in the header.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show footer",
        description: "Show the previous period total, the highest rule level and the indexer health.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
