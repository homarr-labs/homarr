import { IconFileAlert, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "../wazuh/_shared/options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhFim", {
  icon: IconFileAlert,
  ...getWidgetIntegrationConfig("wazuhFim"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      range: factory.select({ defaultValue: "24h", options: [...wazuhTimeRangeOptions] }),
      event: factory.select({
        defaultValue: "all",
        options: [
          { value: "all", label: "All events" },
          { value: "added", label: "Added" },
          { value: "modified", label: "Modified" },
          { value: "deleted", label: "Deleted" },
        ],
      }),
      limit: factory.number({ defaultValue: 20, step: 1, validate: z.number().int().min(1).max(100) }),
      includeRegistry: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
