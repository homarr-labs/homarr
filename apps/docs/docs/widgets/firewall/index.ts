import { WidgetDefinition } from "@site/src/types";
import { IconWall } from "@tabler/icons-react";

export const firewallWidget: WidgetDefinition = {
  icon: IconWall,
  name: "Firewall Monitoring",
  description: "Displays a summary of firewalls.",
  data: "Displays firewall status including CPU, memory usage, version info, and per-interface bandwidth.",
  path: "../../widgets/firewall",
  configuration: {
    items: [],
  },
};
