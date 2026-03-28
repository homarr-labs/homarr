import { IconServerOff, IconSpeedboat } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("speedtestTracker", {
  icon: IconSpeedboat,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showLatestResult: factory.switch({
        defaultValue: true,
      }),
      showStats: factory.switch({
        defaultValue: true,
      }),
      showRecentResults: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: ["speedtestTracker"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.speedtestTracker.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
