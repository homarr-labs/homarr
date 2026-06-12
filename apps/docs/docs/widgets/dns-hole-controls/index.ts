import { WidgetDefinition } from "@site/src/types";
import { IconDeviceGamepad } from "@tabler/icons-react";
import { integrations } from "../dns-hole-summary";

export const dnsHoleControlsWidget: WidgetDefinition = {
  icon: IconDeviceGamepad,
  name: "DNS Hole Controls",
  description: `Control the blocking feature of your ${integrations} from your dashboard`,
  path: "../../widgets/dns-hole-controls",
  configuration: {
    items: [
      {
        name: "Show Toggle All Buttons",
        description: "Show or not the 2 buttons that may be redundant when having only one DNS Hole.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
