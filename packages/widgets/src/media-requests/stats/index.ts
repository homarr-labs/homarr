import { IconChartBar } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("mediaRequests-requestStats", {
  icon: IconChartBar,
  options: {},
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
