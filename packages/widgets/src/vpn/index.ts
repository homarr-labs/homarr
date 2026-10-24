import { IconShieldLock } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("vpn", {
  supportsAdvancedFocus: false,
  icon: IconShieldLock,
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("vpn"),
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options }) => ({
      main: widgetQuery("widget.vpn.getSummaries", { ...options, integrationIds }),
    }),
  })
  .withDynamicImport(() => import("./component"));
