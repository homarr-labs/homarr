import { IconRoute, IconRouteOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("traefik", {
  icon: IconRoute,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTcp: factory.switch({
        defaultValue: true,
      }),
      showUdp: factory.switch({
        defaultValue: true,
      }),
      showEntryPoints: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("traefik"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconRouteOff,
      message: (t) => t("widget.traefik.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({ main: widgetQuery("widget.traefik.getDashboard", { integrationIds }) }),
  })
  .withDynamicImport(() => import("./component"));
