import { IconHeartRateMonitor, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { supportsStorageVolumeSelection } from "../filter-storage-volumes";
import { optionsBuilder } from "../options";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";
import type { StorageVolumeObservationHook } from "../storage-volume-options";

export interface DefinitionResources {
  useStorageVolumeObservations: StorageVolumeObservationHook;
}

export const createDefinition = (resources: DefinitionResources) =>
  ({
    kind: "healthMonitoring",
    icon: IconHeartRateMonitor,
    supportsAdvancedFocus: true,
    queryKeys: [[["integration", "byIds"]], [["widget", "healthMonitoring"]]],
    refetchInterval: 10,
    createOptions() {
      return optionsBuilder.from(
        (factory) => ({
          fahrenheit: factory.switch({
            defaultValue: false,
          }),
          cpu: factory.switch({
            defaultValue: true,
          }),
          memory: factory.switch({
            defaultValue: true,
          }),
          gpu: factory.switch({
            defaultValue: true,
          }),
          showUptime: factory.switch({
            defaultValue: true,
          }),
          fileSystem: factory.switch({
            defaultValue: true,
          }),
          visibleStorageVolumes: factory.integrationMultiSelect(
            createStorageVolumeMultiSelectOptions(resources.useStorageVolumeObservations),
          ),
          visibleClusterSections: factory.multiSelect({
            options: [
              {
                value: "node",
                label: (t) => t("widget.healthMonitoring.cluster.resource.node.name"),
              },
              {
                value: "qemu",
                label: (t) => t("widget.healthMonitoring.cluster.resource.qemu.name"),
              },
              {
                value: "lxc",
                label: (t) => t("widget.healthMonitoring.cluster.resource.lxc.name"),
              },
              {
                value: "storage",
                label: (t) => t("widget.healthMonitoring.cluster.resource.storage.name"),
              },
            ] as const,
            defaultValue: ["node", "qemu", "lxc", "storage"] as const,
          }),
          defaultTab: factory.select({
            defaultValue: "system",
            options: [
              { value: "system", label: "System" },
              { value: "cluster", label: "Cluster" },
            ] as const,
          }),
          sectionIndicatorRequirement: factory.select({
            defaultValue: "all",
            options: [
              { value: "all", label: "All active" },
              { value: "any", label: "Any active" },
            ] as const,
          }),
        }),
        {
          fahrenheit: {
            shouldHide(_, integrationKinds) {
              return integrationKinds.every((kind) => kind === "proxmox") || integrationKinds.length === 0;
            },
          },
          fileSystem: {
            shouldHide(_, integrationKinds) {
              return integrationKinds.every((kind) => kind === "proxmox") || integrationKinds.length === 0;
            },
          },
          visibleStorageVolumes: {
            shouldHide(_, integrationKinds) {
              return !supportsStorageVolumeSelection(integrationKinds);
            },
          },
          showUptime: {
            shouldHide(_, integrationKinds) {
              return !integrationKinds.includes("proxmox");
            },
          },
          sectionIndicatorRequirement: {
            shouldHide(_, integrationKinds) {
              return !integrationKinds.includes("proxmox");
            },
          },
          visibleClusterSections: {
            shouldHide(_, integrationKinds) {
              return !integrationKinds.includes("proxmox");
            },
          },
          defaultTab: {
            shouldHide(_, integrationKinds) {
              return !integrationKinds.includes("proxmox");
            },
          },
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
  }) satisfies WidgetDefinition & { kind: "healthMonitoring" };
