import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { IconChartBar } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestStats", {
  icon: IconChartBar,
  createOptions() {
    return {};
  },
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
}).withDynamicImport(() => import("./component"));
