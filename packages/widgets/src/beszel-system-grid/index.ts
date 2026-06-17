import { IconLayoutGrid, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemGrid", {
  icon: IconLayoutGrid,
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      statusFilter: factory.select({
        defaultValue: "all",
        options: statusOptions,
      }),
      showCpu: factory.switch({ defaultValue: true }),
      showMemory: factory.switch({ defaultValue: true }),
      showDisk: factory.switch({ defaultValue: true }),
      showGpu: factory.switch({ defaultValue: true }),
      showLoadAvg: factory.switch({ defaultValue: true }),
      showNet: factory.switch({ defaultValue: true }),
      showTemp: factory.switch({ defaultValue: true }),
      showBattery: factory.switch({ defaultValue: true }),
      showServices: factory.switch({ defaultValue: true }),
      showUptime: factory.switch({ defaultValue: true }),
      showAgent: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszelSystemGrid.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
