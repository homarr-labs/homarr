import { IconDevicesPc, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhAgents", {
  icon: IconDevicesPc,
  ...getWidgetIntegrationConfig("wazuhAgents"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      statusFilter: factory.select({
        defaultValue: "all",
        options: [
          { value: "all", label: "All agents" },
          { value: "active", label: "Active" },
          { value: "disconnected", label: "Disconnected" },
          { value: "inactive", label: "Not active (disconnected, never connected, pending)" },
        ],
      }),
      sortBy: factory.select({
        defaultValue: "status",
        options: [
          { value: "status", label: "Status" },
          { value: "name", label: "Name" },
          { value: "ip", label: "IP address" },
          { value: "os", label: "Operating system" },
          { value: "version", label: "Wazuh version" },
          { value: "lastKeepAlive", label: "Last keepalive" },
        ],
      }),
      showVersion: factory.switch({ defaultValue: true }),
      showGroups: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
