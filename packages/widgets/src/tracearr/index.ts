import { IconActivityHeartbeat, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("tracearr", {
  icon: IconActivityHeartbeat,
  supportsAdvancedFocus: true,
  refetchInterval: 10,
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
  ...getWidgetIntegrationConfig("tracearr"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.tracearr.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({ main: widgetQuery("widget.tracearr.getDashboard", { integrationIds }) }),
  })
  .withDynamicImport(() => import("./component"));
