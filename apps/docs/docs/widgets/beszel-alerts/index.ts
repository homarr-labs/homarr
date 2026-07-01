import { WidgetDefinition } from "@site/src/types";
import { IconBell } from "@tabler/icons-react";

export const beszelAlertsWidget: WidgetDefinition = {
  icon: IconBell,
  name: "Beszel Alerts",
  description: "View Beszel alert configurations and history with triggered/ok status indicators.",
  data: "Displays active and historical alerts for Beszel-monitored systems with metric type indicators and resolution status.",
  path: "../../widgets/beszel-alerts",
  configuration: {
    items: [
      {
        name: "Show history",
        description: "Displays the alert trigger history",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Max history items",
        description: "Maximum number of history entries to display (1-100)",
        values: "Number (1-100)",
        defaultValue: "10",
      },
    ],
  },
};
