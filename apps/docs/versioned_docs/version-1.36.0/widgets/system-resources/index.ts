import { WidgetDefinition } from "@site/src/types";
import { IconGraph } from "@tabler/icons-react";

export const systemResourcesWidget: WidgetDefinition = {
  icon: IconGraph,
  name: "System Resources",
  description: "Displays CPU, RAM and network of your host",
  path: "../../widgets/system-resources",
};
