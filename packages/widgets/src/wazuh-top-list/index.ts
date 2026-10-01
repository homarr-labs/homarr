import { IconListNumbers, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "../wazuh/_shared/options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhTopList", {
  icon: IconListNumbers,
  ...getWidgetIntegrationConfig("wazuhTopList"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      kind: factory.select({
        defaultValue: "rules",
        options: [
          { value: "rules", label: "Top rules" },
          { value: "agents", label: "Top agents by alerts" },
          { value: "sourceIps", label: "Top source IPs" },
          { value: "mitreTactics", label: "Top MITRE ATT&CK tactics" },
          { value: "mitreTechniques", label: "Top MITRE ATT&CK techniques" },
        ],
      }),
      range: factory.select({ defaultValue: "24h", options: [...wazuhTimeRangeOptions] }),
      limit: factory.number({ defaultValue: 8, step: 1, validate: z.number().int().min(1).max(50) }),
      minLevel: factory.number({ defaultValue: 0, step: 1, validate: z.number().int().min(0).max(16) }),
      showBars: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
