import { IconActivityHeartbeat, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("tracearr", {
  icon: IconActivityHeartbeat,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showStreams: factory.switch({
        defaultValue: true,
      }),
      showStats: factory.switch({
        defaultValue: true,
      }),

      showRecentActivity: factory.switch({
        defaultValue: true,
      }),
      showViolations: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: ["tracearr"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.tracearr.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
