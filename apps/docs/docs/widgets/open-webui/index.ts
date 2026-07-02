import { WidgetDefinition } from "@site/src/types";
import { IconRobot } from "@tabler/icons-react";

export const openWebUiWidget: WidgetDefinition = {
  icon: IconRobot,
  name: "AI Chat",
  description: "Chat with AI models through Open WebUI, with model picking and history.",
  path: "../../widgets/open-webui",
  configuration: {
    items: [
      {
        name: "System prompt",
        description: "Optional instruction prepended to every conversation.",
        values: { type: "string" },
        defaultValue: "empty",
      },
      {
        name: "Show chat history",
        description: "Show a button to browse and reopen previous Open WebUI chats.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
