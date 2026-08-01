import type { WidgetDefinition } from "@site/src/types";
import { IconRobot } from "@tabler/icons-react";

export const assistantWidget: WidgetDefinition = {
  icon: IconRobot,
  name: "Assistant",
  description: "Have a complete assistant conversation directly on a board.",
  path: "../../widgets/assistant",
  configuration: {
    items: [
      {
        name: "Conversation",
        description: "Follow the active conversation or attach the widget to one persisted conversation.",
        values: ["Current conversation", "Pinned conversation"],
        defaultValue: "Current conversation",
      },
      {
        name: "Pinned conversation",
        description: "Search for a conversation. This field is hidden when Current conversation is selected.",
        values: { type: "string" },
        defaultValue: "Hidden",
      },
    ],
  },
};
