import { IconLockExclamation, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhAuthFailures", {
  icon: IconLockExclamation,
  ...getWidgetIntegrationConfig("wazuhAuthFailures"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hours: factory.number({ defaultValue: 24, step: 1, validate: z.number().int().min(1).max(168) }),
      limit: factory.number({ defaultValue: 6, step: 1, validate: z.number().int().min(1).max(25) }),
      showSourceIps: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options }) => ({
      main: widgetQuery("widget.wazuh.getAuthFailures", {
        integrationId: integrationIds[0] ?? "",
        hours: options.hours,
        limit: options.limit,
      }),
    }),
  })
  .withDynamicImport(() => import("./component"));
