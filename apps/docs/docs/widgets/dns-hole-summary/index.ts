import { WidgetDefinition } from "@site/src/types";
import { IconAd } from "@tabler/icons-react";

export const integrations = "Pi-hole, AdGuard Home or Technitium DNS";

export const dnsHoleSummaryWidget: WidgetDefinition = {
  icon: IconAd,
  name: "DNS Hole Summary",
  description: `Displays the summary of your ${integrations} blocks and queries statistics`,
  path: "../../widgets/dns-hole-summary",
  configuration: {
    items: [
      {
        name: "Layout",
        description: "Choose the layout of the widget",
        values: {
          type: "select",
          options: ["Horizontal", "Vertical", "Grid"],
        },
        defaultValue: "Grid",
      },
      {
        name: "Use Pi-Hole colors",
        description: `Color the tiles using the background color, that is used by default in ${integrations}.`,
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
