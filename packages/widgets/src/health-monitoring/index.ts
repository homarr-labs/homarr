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
    defaultTab: factory.select({
      defaultValue: "system",
      options: [
        { value: "system", label: "System" },
        { value: "cluster", label: "Cluster" },
      ] as const,
    }),
    sectionIndicatorRequirement: factory.select({
      defaultValue: "all",
      options: [
        { value: "all", label: "All active" },
        { value: "any", label: "Any active" },
      ] as const,
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
