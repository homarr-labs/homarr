import { IconGraphFilled } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  supportedIntegrations: ["dashDot", "openmediavault"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hasShadow: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
