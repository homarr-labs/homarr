import { IconHeartRateMonitor, IconServerOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("healthMonitoring", {
  icon: IconHeartRateMonitor,
  options: optionsBuilder.from((factory) => ({
    fahrenheit: factory.switch({
      defaultValue: false,
    }),
    cpu: factory.switch({
      defaultValue: true,
    }),
    memory: factory.switch({
      defaultValue: true,
    }),
    fileSystem: factory.switch({
      defaultValue: true,
    }),
  })),
  supportedIntegrations: getIntegrationKindsByCategory("healthMonitoring"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.healthMonitoring.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
