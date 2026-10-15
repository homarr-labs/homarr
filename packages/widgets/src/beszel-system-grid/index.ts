import { IconLayoutGrid, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { createBeszelMetricOptions, statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";
import { beszelOptionsSuperRefine } from "../beszel/_shared/threshold-colors";
import { createBeszelThresholdOptions, beszelThresholdFieldConfiguration } from "../beszel/_shared/threshold-options";

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemGrid", {
  icon: IconLayoutGrid,
  queryKey: [["widget", "beszel", "getSystems"]],
  ...getWidgetIntegrationConfig("beszelSystemGrid"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        statusFilter: factory.select({
          defaultValue: "all",
          options: statusOptions,
        }),
        ...createBeszelThresholdOptions(factory),
        ...createBeszelMetricOptions(() => factory.switch({ defaultValue: true })),
      }),
      beszelThresholdFieldConfiguration,
      beszelOptionsSuperRefine,
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszel.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
