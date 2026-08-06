import { IconShieldLock } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("vpn", {
  icon: IconShieldLock,
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  supportedIntegrations: getIntegrationKindsByCategory("vpn"),
}).withDynamicImport(() => import("./component"));
