import { IconServerOff, IconTable } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";

const sortOptions = [
  { value: "name", label: "System" },
  { value: "cpu", label: "CPU" },
  { value: "memory", label: "Memory" },
  { value: "disk", label: "Disk" },
  { value: "gpu", label: "GPU" },
  { value: "loadAvg", label: "Load Avg" },
  { value: "netBytes", label: "Net" },
  { value: "temp", label: "Temp" },
  { value: "services", label: "Services" },
  { value: "uptime", label: "Uptime" },
  { value: "agentVersion", label: "Agent" },
];

const sortDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemTable", {
  icon: IconTable,
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      statusFilter: factory.select({
        defaultValue: "all",
        options: statusOptions,
      }),
      sortBy: factory.select({ defaultValue: "name", options: sortOptions }),
      sortDirection: factory.select({
        defaultValue: "asc",
        options: sortDirectionOptions,
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
      message: (t) => t("widget.beszelSystemTable.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
