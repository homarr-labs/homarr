import { IconLayoutGrid, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { createBeszelMetricOptions, statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemGrid", {
  icon: IconLayoutGrid,
  queryKey: [["widget", "beszel", "getSystems"]],
  ...getWidgetIntegrationConfig("beszelSystemGrid"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      statusFilter: factory.select({
        defaultValue: "all",
        options: statusOptions,
      }),
      ...createBeszelMetricOptions(() => factory.switch({ defaultValue: true })),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszel.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    stream: true,
    queries: ({ integrationIds }) => ({ main: widgetQuery("widget.beszel.getSystems", { integrationIds }) }),
  })
  .withDynamicImport(() => import("./component"));
