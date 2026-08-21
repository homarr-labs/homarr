import { IconServerOff, IconTable } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import type { SelectOption } from "../_inputs/widget-select-input";
import { statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";

const sortOptions = [
  { value: "name", label: (t) => t("widget.beszel.metric.system") },
  { value: "cpu", label: invariantTechnicalLabels.cpu },
  { value: "memory", label: (t) => t("widget.beszel.metric.memory") },
  { value: "disk", label: (t) => t("widget.beszel.metric.disk") },
  { value: "gpu", label: invariantTechnicalLabels.gpu },
  { value: "loadAvg", label: (t) => t("widget.beszel.metric.loadAvg") },
  { value: "netBytes", label: (t) => t("widget.beszel.metric.net") },
  { value: "temp", label: (t) => t("widget.beszel.metric.temp") },
  { value: "services", label: (t) => t("common.services") },
  { value: "uptime", label: (t) => t("widget.beszel.metric.uptime") },
  { value: "agentVersion", label: (t) => t("widget.beszel.metric.agent") },
] satisfies SelectOption[];

const sortDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemTable", {
  icon: IconTable,
  queryKeys: [[["widget", "beszel", "getSystems"]], [["widget", "beszel", "getSystemStats"]]],
  queryMatcher: (query, scope) =>
    query.path.at(-1) === "getSystems"
      ? widgetQueryInputMatches(query.input, { integrationIds: scope.integrationIds })
      : matchesWidgetRuntimeQuery(query, scope),
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
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
        columnOrder: factory.text({ defaultValue: "" }),
        columnWidths: factory.text({ defaultValue: "" }),
      }),
      {
        columnOrder: { shouldHide: () => true },
        columnWidths: { shouldHide: () => true },
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszel.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
