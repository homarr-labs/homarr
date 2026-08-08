import { WidgetDefinition } from "@site/src/types";
import { IconBrandDocker } from "@tabler/icons-react";

export const wudWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: "What's Up Docker",
  description: "Displays how many watched containers have image updates available.",
  path: "../../widgets/whats-up-docker",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the icon and \"What's Up Docker\" label above the stats",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show update ring",
        description: "Displays a ring showing the percentage of monitored containers with a pending update",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Layout",
        description: "Arrange the two stats side by side (Horizontal) or stacked (Vertical)",
        values: { type: "select", options: ["Horizontal", "Vertical"] },
        defaultValue: "Horizontal",
      },
      {
        name: "Show container update list",
        description: "Lists each monitored container that has an image update available, linking to its release notes when known",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
