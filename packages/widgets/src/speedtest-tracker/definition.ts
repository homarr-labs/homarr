import { IconServerOff, IconSpeedboat } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "speedtestTracker",
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
} satisfies WidgetDefinition & { kind: "speedtestTracker" };
