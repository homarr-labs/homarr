import { IconBatteryCharging, IconBatteryOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("ups", {
  icon: IconBatteryCharging,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showBattery: factory.switch({
        defaultValue: true,
      }),
      showLoad: factory.switch({
        defaultValue: true,
      }),
      showVoltage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("ups"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconBatteryOff,
      message: (t) => t("widget.ups.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({ main: widgetQuery("widget.ups.getSummaries", { integrationIds }) }),
  })
  .withDynamicImport(() => import("./component"));
