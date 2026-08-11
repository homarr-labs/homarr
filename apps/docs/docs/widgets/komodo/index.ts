import { WidgetDefinition } from "@site/src/types";
import { IconServer2 } from "@tabler/icons-react";

export const komodoWidget: WidgetDefinition = {
  icon: IconServer2,
  name: "Komodo Overview",
  description: "Displays server, stack, deployment, and problem counts from Komodo.",
  path: "../../widgets/komodo",
  configuration: {
    items: [
      {
        name: "Show servers",
        description: "Display the server status summary.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show stacks",
        description: "Display the stack status summary.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show deployments",
        description: "Display the deployment status summary.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show problems",
        description: "Display the combined problem count and, when space permits, the problem list.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Refresh interval",
        description: "How often to retrieve new data from Komodo, in seconds.",
        values: { type: "string" },
        defaultValue: "30",
      },
    ],
  },
};
