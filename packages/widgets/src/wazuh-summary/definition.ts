import { IconServerOff, IconShieldHalfFilled } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "../wazuh/_shared/options";

export const definition = {
  kind: "wazuhSummary",
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
} satisfies WidgetDefinition & { kind: "wazuhSummary" };
