import { IconServerOff, IconShieldHalfFilled } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "../wazuh/_shared/options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhSummary", {
  icon: IconShieldHalfFilled,
  ...getWidgetIntegrationConfig("wazuhSummary"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      range: factory.select({ defaultValue: "24h", options: [...wazuhTimeRangeOptions] }),
      showTrend: factory.switch({ defaultValue: true }),
      showFooter: factory.switch({ defaultValue: true }),
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
      main: widgetQuery("widget.wazuh.getSummary", { integrationId: integrationIds[0] ?? "", range: options.range }),
    }),
  })
  .withDynamicImport(() => import("./component"));
