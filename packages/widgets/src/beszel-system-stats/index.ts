import { IconChartAreaLine, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const timePeriodOptions = [
  { value: "1m", label: "Live" },
  { value: "1h", label: "1 Hour" },
  { value: "12h", label: "12 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "1w", label: "1 Week" },
  { value: "30d", label: "30 Days" },
];

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemStats", {
  icon: IconChartAreaLine,
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      systemId: factory.text({ defaultValue: "" }),
      timePeriod: factory.select({
        defaultValue: "1h",
        options: timePeriodOptions,
      }),
      showCpu: factory.switch({ defaultValue: true }),
      showMemory: factory.switch({ defaultValue: true }),
      showDisk: factory.switch({ defaultValue: true }),
      showDiskIO: factory.switch({ defaultValue: true }),
      showNetwork: factory.switch({ defaultValue: true }),
      showDockerCpu: factory.switch({ defaultValue: true }),
      showDockerMemory: factory.switch({ defaultValue: true }),
      showDockerNetwork: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszelSystemStats.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
