import { IconShieldLock } from "@tabler/icons-react";


import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("vpn", {
  supportsAdvancedFocus: false,
  icon: IconShieldLock,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
}).withDynamicImport(() => import("./component"));
