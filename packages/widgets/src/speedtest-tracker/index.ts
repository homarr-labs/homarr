import { IconServerOff, IconSpeedboat } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("speedtestTracker", {
  icon: IconSpeedboat,
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showLatestResult: factory.switch({
          defaultValue: true,
        }),
        showStats: factory.switch({
          defaultValue: true,
        }),
        showRecentResults: factory.switch({
          defaultValue: true,
        }),
        showPingGraph: factory.switch({
          defaultValue: true,
        }),
      }),
      {
        showPingGraph: {
          shouldHide: (options) => !options.showRecentResults,
        },
      },
    );
  },
  ...getWidgetIntegrationConfig("speedtestTracker"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.speedtestTracker.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.speedtestTracker.getDashboard", { integrationIds }),
    }),
  })
  .withDynamicImport(() => import("./component"));
