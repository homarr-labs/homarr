import { WidgetDefinition } from "@site/src/types";
import { IconChartBar } from "@tabler/icons-react";

export const mediaRequestStatsWidget: WidgetDefinition = {
  icon: IconChartBar,
  name: "Media Requests Stats",
  description: "Statistics about your media requests",
  data: "Displays media request statistics including approved, pending, declined counts and top users.",
  path: "../../widgets/media-request-stats",
  configuration: {
    items: [],
  },
};
