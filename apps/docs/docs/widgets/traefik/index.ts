import { WidgetDefinition } from "@site/src/types";
import { IconRoute } from "@tabler/icons-react";

export const traefikWidget: WidgetDefinition = {
  icon: IconRoute,
  name: "Traefik",
  description: "Overview of Traefik routers, services, middlewares, and entry points.",
  path: "../../widgets/traefik",
  configuration: {
    items: [
      {
        name: "Show TCP",
        description: "Display TCP routers, services, and middlewares.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show UDP",
        description: "Display UDP routers and services.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show entry points",
        description: "Display the configured Traefik entry point names.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
