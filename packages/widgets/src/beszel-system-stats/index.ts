import { IconChartAreaLine, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

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
      systemId: factory.integrationSelect({
        withDescription: true,
        clearable: true,
        useOptions: (integrationIds: string[]) => {
          const {
            data = [],
            isPending,
            isError,
          } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds }, { enabled: integrationIds.length > 0 });
          const selectData = data.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name })));
          return { data: selectData, isPending, isError };
        },
      }),
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
      showStorage: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszelSystemStats.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
