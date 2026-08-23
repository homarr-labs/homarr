import { IconWall, IconWallOff } from "@tabler/icons-react";


import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("firewall", {
  icon: IconWall,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconWallOff,
      message: (t) => t("widget.firewall.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
