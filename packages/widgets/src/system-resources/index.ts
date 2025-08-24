import { IconGraphFilled } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas"],
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
}).withDynamicImport(() => import("./component"));
