import { IconHeartbeat, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("uptimeKuma", {
  icon: IconHeartbeat,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showAverageUptime: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showUptimeRing: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showTotalMonitors: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showUpCount: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showDownCount: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showPausedCount: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
  supportedIntegrations: ["uptimeKuma"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.uptimeKuma.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
