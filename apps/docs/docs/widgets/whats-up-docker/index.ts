import { WidgetDefinition } from "@site/src/types";
import { IconBrandDocker } from "@tabler/icons-react";

export const wudWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: "What's Up Docker",
  description: "Displays how many watched containers have image updates available.",
  path: "../../widgets/whats-up-docker",
  configuration: {
    items: [],
  },
};
