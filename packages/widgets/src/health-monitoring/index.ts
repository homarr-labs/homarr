import { IconHeartRateMonitor, IconServerOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { z } from "zod";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("healthMonitoring", {
  icon: IconHeartRateMonitor,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      fahrenheit: factory.switch({
        defaultValue: false,
      }),
      systemInfo: factory.switch({
        defaultValue: true,
      }),
      cpu: factory.switch({
        defaultValue: true,
      }),
      cpuDetailed: factory.switch({
        defaultValue: true,
      }),
      cpuColumns: factory.number({
        defaultValue: 2,
        step: 1,
        validate: z.number().min(1).max(4),
      }),
      memory: factory.switch({
        defaultValue: true,
      }),
      network: factory.switch({
        defaultValue: true,
      }),
      fileSystem: factory.switch({
        defaultValue: true,
      }),
      pointDensity: factory.number({
        defaultValue: 12,
        step: 1,
        validate: z.number().min(1).max(60),
      }),
    }))
  },
  supportedIntegrations: getIntegrationKindsByCategory("healthMonitoring"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.healthMonitoring.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
