import { IconBatteryCharging, IconBatteryOff } from "@tabler/icons-react";


import { createWidgetDefinition } from "../definition";
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
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconBatteryOff,
      message: (t) => t("widget.ups.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
