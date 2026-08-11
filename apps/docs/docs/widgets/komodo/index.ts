import { WidgetDefinition } from "@site/src/types";
import { IconServer2 } from "@tabler/icons-react";

export const komodoWidget: WidgetDefinition = {
  icon: IconServer2,
  name: "Komodo Overview",
  description: "Displays server, stack, deployment, and problem counts from Komodo.",
  path: "../../widgets/komodo",
  configuration: {
    items: [],
  },
};
