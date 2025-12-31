import { WidgetDefinition } from "@site/src/types";
import { IconBrandDocker } from "@tabler/icons-react";

export const dockerContainersWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: "Docker stats",
  description: "Stats of your containers",
  path: "../../widgets/docker-containers",
  configuration: { items: [] },
};
