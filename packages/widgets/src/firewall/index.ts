import { IconWall, IconWallOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("firewall", {
  icon: IconWall,
  supportsAdvancedFocus: true,
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("firewall"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconWallOff,
      message: (t) => t("widget.firewall.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({
      cpu: widgetQuery("widget.firewall.getFirewallCpuStatus", { integrationIds }),
      memory: widgetQuery("widget.firewall.getFirewallMemoryStatus", { integrationIds }),
      version: widgetQuery("widget.firewall.getFirewallVersionStatus", { integrationIds }),
      interfaces: widgetQuery("widget.firewall.getFirewallInterfacesStatus", { integrationIds }),
    }),
  })
  .withDynamicImport(() => import("./component"));
