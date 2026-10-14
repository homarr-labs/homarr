import { IconWall, IconWallOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "firewall",
  icon: IconWall,
  supportsAdvancedFocus: true,
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("firewall"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconWallOff,
      message: (t) => t("widget.firewall.error.internalServerError"),
    },
  },
} satisfies WidgetDefinition & { kind: "firewall" };
