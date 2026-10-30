import { IconServerOff, IconTable } from "@tabler/icons-react";

import { getWidgetIntegrationConfig, invariantTechnicalLabels } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import type { SelectOption } from "../_inputs/widget-select-input";
import { statusOptions } from "../beszel/_shared/options";
import { optionsBuilder } from "../options";
import { beszelTableMetricOptionKeys } from "./display";

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
  ...getWidgetIntegrationConfig("beszelSystemTable"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        columns: factory.multiSelect({
          defaultValue: [...beszelTableMetricOptionKeys],
          options: [
            { value: "showCpu", label: invariantTechnicalLabels.cpu },
            { value: "showMemory", label: (t) => t("widget.beszel.metric.memory") },
            { value: "showDisk", label: (t) => t("widget.beszel.metric.disk") },
            { value: "showGpu", label: invariantTechnicalLabels.gpu },
            { value: "showLoadAvg", label: (t) => t("widget.beszel.metric.loadAvg") },
            { value: "showNet", label: (t) => t("widget.beszel.metric.net") },
            { value: "showTemp", label: (t) => t("widget.beszel.metric.temp") },
            { value: "showBattery", label: (t) => t("widget.beszel.metric.battery") },
            { value: "showServices", label: (t) => t("common.services") },
            { value: "showUptime", label: (t) => t("widget.beszel.metric.uptime") },
            { value: "showAgent", label: (t) => t("widget.beszel.metric.agent") },
          ],
          searchable: true,
        }),
        statusFilter: factory.select({
          defaultValue: "all",
          options: statusOptions,
        }),
        fahrenheit: factory.switch({
          defaultValue: false,
        }),
        sortBy: factory.select({ defaultValue: "name", options: sortOptions }),
        sortDirection: factory.select({
          defaultValue: "asc",
          options: sortDirectionOptions,
        }),
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
