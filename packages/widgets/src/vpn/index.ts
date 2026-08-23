import { IconShieldLock } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("vpn", {
  supportsAdvancedFocus: false,
  icon: IconShieldLock,
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("vpn"),
}).withDynamicImport(() => import("./component"));
