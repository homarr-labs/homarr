import { IconCloud, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("coolify", {
  supportsAdvancedFocus: true,
  icon: IconCloud,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showServers: factory.switch({
        defaultValue: true,
      }),
      showApplications: factory.switch({
        defaultValue: true,
      }),
      showServices: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("coolify"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.coolify.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
