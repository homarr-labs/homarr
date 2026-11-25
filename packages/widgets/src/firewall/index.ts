import { IconWall, IconWallOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { createWidgetRefreshIntervalOptions } from "../refresh-interval";

export const { definition, componentLoader } = createWidgetDefinition("firewall", {
  icon: IconWall,
  supportsAdvancedFocus: true,
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(() => ({
      ...createWidgetRefreshIntervalOptions(10),
    }));
  },
  ...getWidgetIntegrationConfig("firewall"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconWallOff,
      message: (t) => t("widget.firewall.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
