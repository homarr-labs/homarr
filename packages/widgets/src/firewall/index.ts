import { IconWall, IconWallOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("firewall", {
  icon: IconWall,
  supportsAdvancedFocus: true,
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  supportedIntegrations: [...getIntegrationKindsByCategory("firewall"), "mock"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconWallOff,
      message: (t) => t("widget.firewall.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
