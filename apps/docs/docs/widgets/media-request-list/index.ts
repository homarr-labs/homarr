import { WidgetDefinition } from "@site/src/types";
import { IconZoomQuestion } from "@tabler/icons-react";

export const mediaRequestListWidget: WidgetDefinition = {
  icon: IconZoomQuestion,
  name: "Media Request List",
  description: "See a list of all media requests from your integration",
  path: "../../widgets/media-request-list",
  configuration: {
    items: [
      {
        name: "Open links in new tab",
        description: "If enabled, links will open in a new tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Statuses to show",
        description:
          "Only requests with these statuses will be shown. Defaults to all statuses ('pending', 'approved', 'declined', 'failed', 'completed').",
        values: "List of: 'pending', 'approved', 'declined', 'failed', 'completed'",
        defaultValue: "All statuses",
      },
      {
        name: "Show only recent requests",
        description:
          "Limit to requests created within this amount of time. Set to 0 to disable the time filter and show all requests.",
        values: "0-365 (combined with the time unit below)",
        defaultValue: "0",
      },
      {
        name: "Time unit",
        description: "Unit used by the time filter (days or weeks).",
        values: "'days' or 'weeks'",
        defaultValue: "days",
      },
    ],
  },
};
