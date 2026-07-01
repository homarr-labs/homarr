import { WidgetDefinition } from "@site/src/types";
import { IconMessage } from "@tabler/icons-react";

export const notificationsWidget: WidgetDefinition = {
  icon: IconMessage,
  name: "Notifications",
  description: "Display notification history from an integration",
  data: "Displays a scrollable list of notification messages from integrations like Gotify, Sonarr, and Radarr.",
  path: "../../widgets/notifications",
  configuration: {
    items: [],
  },
};
