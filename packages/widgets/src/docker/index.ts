import { IconBrandDocker, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("dockerContainers", {
  icon: IconBrandDocker,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dockerContainers.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
