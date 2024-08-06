import { IconChartBar } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("mediaRequests-requestStats", {
  icon: IconChartBar,
  options: {},
  supportedIntegrations: ["overseerr", "jellyseerr"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
