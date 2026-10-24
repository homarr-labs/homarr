import { IconBadgeCc, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("bazarr", {
  supportsAdvancedFocus: true,
  icon: IconBadgeCc,
  ...getWidgetIntegrationConfig("bazarr"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showMissingEpisodes: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showMissingMovies: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showProviderIssues: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showHealthIssues: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.bazarr.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.bazarr.getBadges", { integrationId: integrationIds[0] ?? "" }),
    }),
  })
  .withDynamicImport(() => import("./component"));
