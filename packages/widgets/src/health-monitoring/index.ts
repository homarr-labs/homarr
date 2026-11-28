import dynamic from "next/dynamic";
import { createElement } from "react";
import { IconHeartRateMonitor, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import {
  getWidgetIntegrationConfig,
  healthMonitoringClusterIntegrationKinds,
  healthMonitoringSystemIntegrationKinds,
} from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { canSelectStorageVolumes } from "../filter-storage-volumes";
import { optionsBuilder } from "../options";
import type { SortableItemListInput } from "../options";
import { createWidgetRefreshIntervalOptions } from "../refresh-interval";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";
import { healthMetrics } from "./configuration";
import type { HealthMetric } from "./configuration";

const MetricOrderInput = dynamic(() => import("./metric-order-input").then((module) => module.MetricOrderInput));

const metricOrderInput: SortableItemListInput<HealthMetric, HealthMetric> = {
  ItemComponent: (props) => createElement(MetricOrderInput, props),
  AddButton: (props) => createElement(MetricOrderInput, props),
  uniqueIdentifier: (metric) => metric,
  useData: () => ({ data: [...healthMetrics], isLoading: false, error: null }),
};

const hasSystems = (kinds: IntegrationKind[]) =>
  healthMonitoringSystemIntegrationKinds.some((kind) => kinds.includes(kind));
const hasClusters = (kinds: IntegrationKind[]) =>
  healthMonitoringClusterIntegrationKinds.some((kind) => kinds.includes(kind));
const systemOnly = { shouldHide: (_: unknown, kinds: IntegrationKind[]) => !hasSystems(kinds) };
const clusterOnly = { shouldHide: (_: unknown, kinds: IntegrationKind[]) => !hasClusters(kinds) };
const mixedOnly = { shouldHide: (_: unknown, kinds: IntegrationKind[]) => !hasSystems(kinds) || !hasClusters(kinds) };
const automaticMetric = {
  advanced: true,
  shouldHide: (options: { metricOrder?: unknown }, kinds: IntegrationKind[]) =>
    !hasSystems(kinds) || (Array.isArray(options.metricOrder) && options.metricOrder.length > 0),
};
const sharedMetric = {
  advanced: true,
  shouldHide: (options: { metricOrder?: unknown }, kinds: IntegrationKind[]) =>
    !hasClusters(kinds) && automaticMetric.shouldHide(options, kinds),
};
const threshold = { defaultValue: 90, validate: z.number().int().min(1).max(100), step: 1 };
const advancedSystemOnly = { ...systemOnly, advanced: true };

export const { definition, componentLoader } = createWidgetDefinition("healthMonitoring", {
  icon: IconHeartRateMonitor,
  supportsAdvancedFocus: true,
  queryKeys: [[["integration", "byIds"]], [["widget", "healthMonitoring"]]],
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        presentation: factory.select({
          defaultValue: "adaptive",
          withDescription: true,
          allowDeselect: false,
          options: (["adaptive", "list", "cards", "history"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.healthMonitoring.option.presentation.${value}`),
          })),
        }),
        healthFilter: factory.select({
          defaultValue: "all",
          allowDeselect: false,
          options: [
            { value: "all", label: (t) => t("widget.healthMonitoring.rework.allSystems") },
            { value: "attention", label: (t) => t("widget.healthMonitoring.rework.attention") },
          ] as const,
        }),
        systemSort: factory.select({
          defaultValue: "configured",
          allowDeselect: false,
          options: (["configured", "name", "attention", "cpu", "memory", "storage", "provider"] as const).map(
            (value) => ({ value, label: (t) => t(`widget.healthMonitoring.option.systemSort.${value}`) }),
          ),
        }),
        density: factory.select({
          defaultValue: "auto",
          allowDeselect: false,
          options: (["auto", "compact", "comfortable"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.healthMonitoring.option.density.${value}`),
          })),
        }),
        metricOrder: factory.sortableItemList(metricOrderInput),
        visibleStorageVolumes: factory.integrationMultiSelect(createStorageVolumeMultiSelectOptions()),
        fahrenheit: factory.switch({ defaultValue: false }),
        showUptime: factory.switch({ defaultValue: true }),
        historyWindow: factory.select({
          defaultValue: "5m",
          allowDeselect: false,
          options: [
            { value: "5m", label: (t) => t("widget.healthMonitoring.rework.history5m") },
            { value: "15m", label: (t) => t("widget.healthMonitoring.rework.history15m") },
          ] as const,
        }),
        cpuThreshold: factory.number(threshold),
        memoryThreshold: factory.number(threshold),
        storageThreshold: factory.number(threshold),
        cpu: factory.switch({ defaultValue: true, skipContextMenu: true }),
        memory: factory.switch({ defaultValue: true, skipContextMenu: true }),
        gpu: factory.switch({ defaultValue: true, skipContextMenu: true }),
        fileSystem: factory.switch({ defaultValue: true, skipContextMenu: true }),
        selectedSystem: factory.internal({ defaultValue: "" }),
        visibleClusterSections: factory.multiSelect({
          options: (["node", "qemu", "lxc", "storage"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.healthMonitoring.cluster.resource.${value}.name`),
          })),
          defaultValue: ["node", "qemu", "lxc", "storage"],
        }),
        defaultTab: factory.select({
          defaultValue: "system",
          allowDeselect: false,
          options: [
            { value: "system", label: (t) => t("widget.healthMonitoring.tab.system") },
            { value: "cluster", label: (t) => t("widget.healthMonitoring.tab.cluster") },
          ] as const,
        }),
        tabOrder: factory.select({
          defaultValue: "system-first",
          allowDeselect: false,
          options: [
            { value: "system-first", label: (t) => t("widget.healthMonitoring.option.tabOrder.systemFirst") },
            { value: "cluster-first", label: (t) => t("widget.healthMonitoring.option.tabOrder.clusterFirst") },
          ] as const,
        }),
        sectionIndicatorRequirement: factory.select({
          defaultValue: "all",
          allowDeselect: false,
          options: [
            { value: "all", label: (t) => t("widget.healthMonitoring.option.sectionIndicatorRequirement.all") },
            { value: "any", label: (t) => t("widget.healthMonitoring.option.sectionIndicatorRequirement.any") },
          ] as const,
        }),
        ...createWidgetRefreshIntervalOptions(10),
      }),
      {
        presentation: systemOnly,
        density: systemOnly,
        systemSort: systemOnly,
        metricOrder: systemOnly,
        healthFilter: systemOnly,
        historyWindow: advancedSystemOnly,
        cpuThreshold: advancedSystemOnly,
        memoryThreshold: advancedSystemOnly,
        storageThreshold: advancedSystemOnly,
        fahrenheit: advancedSystemOnly,
        cpu: sharedMetric,
        memory: sharedMetric,
        gpu: automaticMetric,
        fileSystem: automaticMetric,
        showUptime: { advanced: true, shouldHide: (_, kinds) => kinds.length === 0 },
        selectedSystem: { shouldHide: () => true },
        visibleStorageVolumes: { advanced: true, shouldHide: (_, kinds) => !kinds.some(canSelectStorageVolumes) },
        visibleClusterSections: clusterOnly,
        sectionIndicatorRequirement: { ...clusterOnly, advanced: true },
        tabOrder: mixedOnly,
        defaultTab: mixedOnly,
      },
    );
  },
  ...getWidgetIntegrationConfig("healthMonitoring"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.healthMonitoring.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
