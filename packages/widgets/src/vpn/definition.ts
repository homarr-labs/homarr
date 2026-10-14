import { IconShieldLock } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "vpn",
  supportsAdvancedFocus: false,
  icon: IconShieldLock,
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("vpn"),
} satisfies WidgetDefinition & { kind: "vpn" };
