import { IconServer2 } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemDisks", {
  icon: IconServer2,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTemperatureIfAvailable: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
